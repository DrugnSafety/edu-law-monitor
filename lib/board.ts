import phoneFile from "../data/office-phones.json";
import { MILESTONE_STEP, pickleDispatchMode } from "./config";
import { latestRun } from "./data";
import { llm } from "./llm";
import { buildCallScript, dispatchPacket, selectCallTargets } from "./pickle";
import { looksLikeInstruction } from "./telegram";
import { newId, store } from "./storage";
import type { ActionPacket, PacketTarget, Post } from "./types";

export const MAX_BODY = 200;
export const MAX_NICK = 20;

export type PublicPost = Pick<Post, "id" | "createdAt" | "nickname" | "stance" | "body">;

export async function listPublicPosts(limit = 50): Promise<PublicPost[]> {
  const all = await store().list<Post>("posts");
  return all
    .filter((p) => !p.hidden)
    .slice(0, limit)
    .map(({ id, createdAt, nickname, stance, body }) => ({ id, createdAt, nickname, stance, body }));
}

export async function boardStats() {
  const all = (await store().list<Post>("posts")).filter((p) => !p.hidden);
  const support = all.filter((p) => p.stance === "support").length;
  const next = (Math.floor(support / MILESTONE_STEP) + 1) * MILESTONE_STEP;
  return { total: all.length, support, other: all.length - support, nextMilestone: next, progress: (support % MILESTONE_STEP) / MILESTONE_STEP };
}

export type CreateResult = { ok: true; post: PublicPost; packet?: ActionPacket | null } | { ok: false; status: number; error: string };

export async function createPost(input: { nickname?: unknown; stance?: unknown; body?: unknown; website?: unknown }, ipHash: string): Promise<CreateResult> {
  // honeypot: 봇은 숨겨진 website 필드를 채움 → 조용히 성공처럼 응답하지 않고 거절
  if (typeof input.website === "string" && input.website.trim()) return { ok: false, status: 400, error: "요청을 처리할 수 없습니다." };
  const body = typeof input.body === "string" ? input.body.replace(/\s+/g, " ").trim() : "";
  const nickname = (typeof input.nickname === "string" ? input.nickname.replace(/\s+/g, " ").trim() : "").slice(0, MAX_NICK) || "익명";
  const stance = input.stance === "other" ? "other" : input.stance === "support" ? "support" : null;
  if (!stance) return { ok: false, status: 400, error: "입장을 선택해 주세요." };
  if (!body) return { ok: false, status: 400, error: "내용을 입력해 주세요." };
  if (body.length > MAX_BODY) return { ok: false, status: 400, error: `${MAX_BODY}자 이내로 입력해 주세요.` };
  if (/https?:\/\/|www\./i.test(body)) return { ok: false, status: 400, error: "링크는 게시할 수 없습니다." };

  const db = store();
  const all = await db.list<Post>("posts", { limit: 500 });
  const now = Date.now();
  const mine = all.filter((p) => p.ipHash === ipHash);
  if (mine.filter((p) => now - new Date(p.createdAt).getTime() < 10 * 60 * 1000).length >= 3)
    return { ok: false, status: 429, error: "잠시 후 다시 시도해 주세요(10분에 3개까지)." };
  if (mine.filter((p) => now - new Date(p.createdAt).getTime() < 24 * 3600 * 1000).length >= 10)
    return { ok: false, status: 429, error: "하루 작성 한도(10개)에 도달했습니다." };
  if (mine.some((p) => p.body === body)) return { ok: false, status: 409, error: "같은 내용이 이미 등록되어 있습니다." };

  const post: Post = { id: newId("p_"), createdAt: new Date().toISOString(), nickname, stance, body, hidden: false, ipHash };
  await db.insert("posts", post);
  const packet = stance === "support" ? await checkMilestone() : null;
  return { ok: true, post: { id: post.id, createdAt: post.createdAt, nickname, stance, body }, packet };
}

// data/office-phones.json(빌드 시 포함). 휴대전화(010) 번호는 방어적으로 제외.
export async function loadOfficePhones(): Promise<PacketTarget[]> {
  const entries = ((phoneFile as { entries?: PacketTarget[] }).entries || []) as PacketTarget[];
  return entries.filter((e) => e.phone && !e.phone.replace(/\D/g, "").startsWith("010"));
}

// 지지 메모가 100의 배수에 도달하면 액션 패킷을 만들고(한 번만), 텔레그램 그룹에 피클 통화 작업을 보낸다.
// 기본 승인 모드: 운영자가 그 메시지에 '승인'이라고 답장해야 통화가 시작된다(PICKLE_DISPATCH_MODE=auto 이면 바로).
export async function checkMilestone(): Promise<ActionPacket | null> {
  const db = store();
  const posts = (await db.list<Post>("posts")).filter((p) => !p.hidden && p.stance === "support");
  const count = posts.length;
  const milestone = Math.floor(count / MILESTONE_STEP) * MILESTONE_STEP;
  if (milestone < MILESTONE_STEP) return null;
  const id = `milestone_${milestone}`;
  if (await db.get<ActionPacket>("packets", id)) return null;

  const memos = await pickMemos(posts);
  const { targets, fallback } = selectCallTargets();
  const stage = (await latestRun())?.stage ?? 1;
  // 자동 모드는 사람 검토가 없으므로 통화 문안에 시민 메모를 인용하지 않는다
  const callScript = buildCallScript(count, memos, stage, undefined, pickleDispatchMode() === "approval");
  const smsText = `[교원 육아휴직 12세 확대 지지] 교육위 소위가 11/17 의결한 교육공무원법 대안(육아휴직 대상 만 8세→12세)에 대해 시민 지지 메모 ${count}개가 모였습니다. 정기회 내(12/9) 신속 처리를 정중히 부탁드립니다.`;
  const packet: ActionPacket = {
    id,
    createdAt: new Date().toISOString(),
    milestone,
    supportCount: count,
    memos,
    callScript,
    smsText,
    targets,
    targetsFallback: fallback,
    smsTargets: targets.filter((t) => !!t.sms),
    status: "queued",
    dispatchedAt: null,
    telegramMessageId: null,
    dispatches: [],
    callResults: [],
  };
  // 동시에 두 요청이 100번째를 넘겨도 패킷·텔레그램 메시지는 한 번만
  if (!(await db.insertIfAbsent("packets", packet))) return null;
  console.log(`[milestone] ${milestone} 도달 → 패킷 생성, 텔레그램 발송 시도`);
  const r = await dispatchPacket(id, stage);
  return r.packet ?? packet;
}

async function pickMemos(posts: Post[]): Promise<{ nickname: string; body: string }[]> {
  const uniq = [...new Map(posts.filter((p) => !looksLikeInstruction(p.body)).map((p) => [p.body, p])).values()];
  // 규칙 기반: 최근 60개 중 20~120자 메모를 우선, 서로 다른 메모 5개
  const recent = uniq.slice(0, 60);
  const mid = recent.filter((p) => p.body.length >= 20 && p.body.length <= 120);
  const fallback = (mid.length >= 3 ? mid : recent)
    .slice(0, 5)
    .map((p) => ({ nickname: p.nickname, body: p.body }));
  const out = await llm(
    "다음 시민 지지 메모 중 서로 다른 관점을 대표하고 정중한 5개를 고른다. 욕설·개인정보·정치적 비방이 있는 메모는 제외한다. 출력은 선택한 id의 JSON 배열만.",
    JSON.stringify(uniq.slice(0, 100).map((p) => ({ id: p.id, body: p.body }))),
    300,
  );
  if (out) {
    try {
      const ids = JSON.parse(out.replace(/^```(json)?|```$/g, "").trim()) as string[];
      const sel = uniq.filter((p) => ids.includes(p.id)).slice(0, 5);
      if (sel.length) return sel.map((p) => ({ nickname: p.nickname, body: p.body }));
    } catch {
      /* fallback */
    }
  }
  return fallback;
}
