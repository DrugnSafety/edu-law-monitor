import { promises as fs } from "fs";
import path from "path";
import { env } from "../config";

// 단순 컬렉션 저장소: Postgres(DATABASE_URL) 또는 로컬 JSON 파일(./data/store.json)
export type Collection = "runs" | "events" | "news" | "posts" | "subscribers" | "packets" | "outbox" | "meta";
export type Rec = { id: string; createdAt: string; [k: string]: unknown };

export interface Store {
  kind: "postgres" | "json";
  insert<T extends Rec>(col: Collection, item: T): Promise<void>;
  /** 같은 id가 없을 때만 넣는다. 넣었으면 true(동시 요청에서 한 번만 true). */
  insertIfAbsent<T extends Rec>(col: Collection, item: T): Promise<boolean>;
  upsert<T extends Rec>(col: Collection, item: T): Promise<void>;
  update<T extends Rec>(col: Collection, id: string, patch: Partial<T>): Promise<T | null>;
  get<T extends Rec>(col: Collection, id: string): Promise<T | null>;
  list<T extends Rec>(col: Collection, opts?: { limit?: number }): Promise<T[]>; // createdAt desc
}

// ---------------- JSON file ----------------
class JsonStore implements Store {
  kind = "json" as const;
  private file = path.join(process.cwd(), "data", "store.json");
  private lock: Promise<unknown> = Promise.resolve();

  private async read(): Promise<Record<string, Rec[]>> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      return {};
    }
  }
  private async write(data: Record<string, Rec[]>) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = this.file + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data, null, 1));
    await fs.rename(tmp, this.file);
  }
  private mutate<R>(fn: (d: Record<string, Rec[]>) => R): Promise<R> {
    const p = this.lock.then(async () => {
      const d = await this.read();
      const r = fn(d);
      await this.write(d);
      return r;
    });
    this.lock = p.catch(() => undefined);
    return p;
  }
  async insert<T extends Rec>(col: Collection, item: T) {
    await this.mutate((d) => {
      (d[col] ||= []).push(item);
    });
  }
  async insertIfAbsent<T extends Rec>(col: Collection, item: T) {
    return this.mutate((d) => {
      const arr = (d[col] ||= []);
      if (arr.some((x) => x.id === item.id)) return false;
      arr.push(item);
      return true;
    });
  }
  async upsert<T extends Rec>(col: Collection, item: T) {
    await this.mutate((d) => {
      const arr = (d[col] ||= []);
      const i = arr.findIndex((x) => x.id === item.id);
      if (i >= 0) arr[i] = item;
      else arr.push(item);
    });
  }
  async update<T extends Rec>(col: Collection, id: string, patch: Partial<T>) {
    return this.mutate((d) => {
      const arr = (d[col] ||= []);
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return null;
      arr[i] = { ...arr[i], ...patch, id } as Rec;
      return arr[i] as T;
    });
  }
  async get<T extends Rec>(col: Collection, id: string): Promise<T | null> {
    await this.lock;
    const d = await this.read();
    return ((d[col] || []).find((x) => x.id === id) as T | undefined) ?? null;
  }
  async list<T extends Rec>(col: Collection, opts?: { limit?: number }) {
    await this.lock;
    const d = await this.read();
    const arr = [...(d[col] || [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return (opts?.limit ? arr.slice(0, opts.limit) : arr) as T[];
  }
}

// ---------------- Postgres ----------------
// 서버리스(Vercel) 기준: 인스턴스당 연결 1~3개, 유휴 연결은 빨리 닫고, 풀러(pgBouncer/Neon pooler) 호환을 위해 prepare:false.
export function pgOptions(url: string) {
  let local = false; // 해석할 수 없는 URL은 원격으로 보고 SSL을 켠다
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^\[|\]$/g, "");
    local = ["localhost", "127.0.0.1", "::1"].includes(host) || u.searchParams.get("sslmode") === "disable";
  } catch {
    local = false;
  }
  const max = Math.min(3, Math.max(1, Number(env("PG_MAX_CONNECTIONS")) || 2));
  return {
    max,
    ssl: local ? false : ("require" as const),
    idle_timeout: 20, // 초. 서버리스 인스턴스가 얼어 있는 동안 연결을 붙잡지 않음
    max_lifetime: 60 * 10,
    connect_timeout: 10,
    prepare: false,
  };
}
type Sql = import("postgres").Sql<Record<string, never>>;
class PgStore implements Store {
  kind = "postgres" as const;
  private sqlP: Promise<Sql> | null = null;
  private ready: Promise<void> | null = null;

  private async sql(): Promise<Sql> {
    if (!this.sqlP) {
      this.sqlP = import("postgres").then((m) => m.default(env("DATABASE_URL")!, pgOptions(env("DATABASE_URL")!)) as unknown as Sql);
    }
    const sql = await this.sqlP;
    if (!this.ready) {
      this.ready = (async () => {
        await sql`CREATE TABLE IF NOT EXISTS elm_records (
          collection text NOT NULL,
          id text NOT NULL,
          created_at timestamptz NOT NULL,
          data jsonb NOT NULL,
          PRIMARY KEY (collection, id)
        )`;
        await sql`CREATE INDEX IF NOT EXISTS elm_records_col_created ON elm_records (collection, created_at DESC)`;
      })();
    }
    await this.ready;
    return sql;
  }
  async insert<T extends Rec>(col: Collection, item: T) {
    const sql = await this.sql();
    await sql`INSERT INTO elm_records (collection, id, created_at, data) VALUES (${col}, ${item.id}, ${item.createdAt}, ${sql.json(item as never)}) ON CONFLICT DO NOTHING`;
  }
  async insertIfAbsent<T extends Rec>(col: Collection, item: T) {
    const sql = await this.sql();
    const rows = await sql`INSERT INTO elm_records (collection, id, created_at, data) VALUES (${col}, ${item.id}, ${item.createdAt}, ${sql.json(item as never)}) ON CONFLICT DO NOTHING RETURNING id`;
    return rows.length > 0;
  }
  async upsert<T extends Rec>(col: Collection, item: T) {
    const sql = await this.sql();
    await sql`INSERT INTO elm_records (collection, id, created_at, data) VALUES (${col}, ${item.id}, ${item.createdAt}, ${sql.json(item as never)})
      ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, created_at = EXCLUDED.created_at`;
  }
  async update<T extends Rec>(col: Collection, id: string, patch: Partial<T>) {
    const sql = await this.sql();
    const rows = await sql`UPDATE elm_records SET data = data || ${sql.json(patch as never)} WHERE collection = ${col} AND id = ${id} RETURNING data`;
    return (rows[0]?.data as T) || null;
  }
  async get<T extends Rec>(col: Collection, id: string): Promise<T | null> {
    const sql = await this.sql();
    const rows = await sql`SELECT data FROM elm_records WHERE collection = ${col} AND id = ${id}`;
    return (rows[0]?.data as T | undefined) ?? null;
  }
  async list<T extends Rec>(col: Collection, opts?: { limit?: number }) {
    const sql = await this.sql();
    const rows = opts?.limit
      ? await sql`SELECT data FROM elm_records WHERE collection = ${col} ORDER BY created_at DESC LIMIT ${opts.limit}`
      : await sql`SELECT data FROM elm_records WHERE collection = ${col} ORDER BY created_at DESC`;
    return rows.map((r: { data?: unknown }) => r.data as T);
  }
}

const g = globalThis as unknown as { __elmStore?: Store };
export function store(): Store {
  if (!g.__elmStore) g.__elmStore = env("DATABASE_URL") ? new PgStore() : new JsonStore();
  return g.__elmStore;
}

export function newId(prefix = ""): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
