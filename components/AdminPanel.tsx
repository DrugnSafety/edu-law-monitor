"use client";
import { useCallback, useEffect, useState } from "react";

type Status = {
  storage: string;
  features: Record<string, boolean>;
  subscribers: { confirmed: number; pending: number };
  runs: { id: string; createdAt: string; trigger: string; verdict: string; headline: string; sources: { name: string; ok: boolean; detail: string }[] }[];
};
type Post = { id: string; createdAt: string; nickname: string; stance: string; body: string; hidden: boolean; ipTag: string };
type Target = { name: string; office: string; phone: string; sourceUrl: string; verified: boolean; sms?: string | null };
type Packet = {
  id: string;
  createdAt: string;
  milestone: number;
  supportCount: number;
  memos: { nickname: string; body: string }[];
  callScript: string;
  smsText: string;
  targets: Target[];
  smsTargets: Target[];
  status: string;
  note?: string;
};

const FEATURE_LABEL: Record<string, string> = { assembly: "국회 API", naver: "네이버 검색", llm: "Anthropic", email: "Resend 메일", postgres: "Postgres", admin: "ADMIN_TOKEN", cron: "CRON_SECRET" };

export default function AdminPanel() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [runResult, setRunResult] = useState<string>("");

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("token");
    const t = q || sessionStorage.getItem("elm_admin") || "";
    if (q) {
      sessionStorage.setItem("elm_admin", q);
      history.replaceState(null, "", "/admin");
    }
    setToken(t);
  }, []);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(path, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      return j;
    },
    [token],
  );

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setErr("");
      const [s, p, k] = await Promise.all([api("/api/admin/status"), api("/api/admin/posts"), api("/api/admin/packets")]);
      setStatus(s);
      setPosts(p.posts);
      setPackets(k.packets);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [api, token]);

  useEffect(() => {
    load();
  }, [load]);

  if (!token)
    return (
      <form
        className="mx-auto max-w-sm space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        onSubmit={(e) => {
          e.preventDefault();
          sessionStorage.setItem("elm_admin", input);
          setToken(input);
        }}
      >
        <h1 className="text-lg font-bold">관리자</h1>
        <input type="password" value={input} onChange={(e) => setInput(e.target.value)} placeholder="ADMIN_TOKEN" className="w-full rounded-lg border px-3 py-2 text-sm" />
        <button className="w-full rounded-lg bg-civic-800 py-2 text-sm font-bold text-white">입장</button>
      </form>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-civic-900">관리자</h1>
        <button
          className="text-xs text-slate-500 underline"
          onClick={() => {
            sessionStorage.removeItem("elm_admin");
            setToken("");
            setStatus(null);
          }}
        >
          로그아웃
        </button>
      </div>
      {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{err}</p>}

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-bold">모니터</h2>
        {status && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-slate-100 px-2 py-0.5">저장소: {status.storage}</span>
            {Object.entries(status.features).map(([k, v]) => (
              <span key={k} className={`rounded px-2 py-0.5 ${v ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                {FEATURE_LABEL[k] || k}: {v ? "설정" : "미설정"}
              </span>
            ))}
            <span className="rounded bg-slate-100 px-2 py-0.5">
              구독자 {status.subscribers.confirmed}(대기 {status.subscribers.pending})
            </span>
          </div>
        )}
        <button
          disabled={!!busy}
          onClick={async () => {
            setBusy("run");
            setRunResult("");
            try {
              const r = await api("/api/admin/run", { method: "POST" });
              setRunResult(`${r.headline}\n이벤트: ${r.events.join(" | ") || "없음"} · 메일 ${r.emailed}건`);
              await load();
            } catch (e) {
              setRunResult("실패: " + (e as Error).message);
            } finally {
              setBusy("");
            }
          }}
          className="mt-3 rounded-lg bg-civic-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy === "run" ? "실행 중…(최대 1분)" : "지금 모니터 실행"}
        </button>
        {runResult && <p className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{runResult}</p>}
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {status?.runs.map((r) => (
            <li key={r.id}>
              <b>{new Date(r.createdAt).toLocaleString("ko-KR")}</b> [{r.trigger}] {r.verdict} — {r.headline}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-bold">마일스톤 액션 큐</h2>
        <p className="mt-1 text-xs text-slate-500">사이트는 전화·문자를 자동 발신하지 않습니다. 대상 번호의 출처를 확인하고, 사람이 승인한 뒤 직접(또는 승인된 도구로) 실행하고 &lsquo;완료&rsquo;로 표시하세요. 마일스톤당 의원실당 1회.</p>
        {packets.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">대기 중인 패킷이 없습니다(지지 100개마다 생성).</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {packets.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    지지 {p.milestone}개 마일스톤 <span className="text-xs text-slate-500">(생성 시 {p.supportCount}개 · {new Date(p.createdAt).toLocaleString("ko-KR")})</span>
                  </p>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold">{p.status}</span>
                </div>
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-civic-700">대표 메모·스크립트·대상 보기</summary>
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {p.memos.map((m, i) => (
                      <li key={i}>
                        {m.body} <span className="text-slate-400">— {m.nickname}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs font-semibold">30초 통화 스크립트</p>
                  <p className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{p.callScript}</p>
                  <p className="mt-2 text-xs font-semibold">문자 문안(공식 공개 문자 수신 번호에 한함)</p>
                  <p className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{p.smsText}</p>
                  <p className="mt-2 text-xs font-semibold">통화 대상 {p.targets.length}곳 · 문자 대상 {p.smsTargets.length}곳</p>
                  <ul className="text-xs">
                    {p.targets.map((t) => (
                      <li key={t.name + t.phone}>
                        {t.name} {t.office} {t.phone} {t.verified ? "(검증)" : "(미검증 — 통화 전 출처 확인)"}{" "}
                        <a className="text-civic-600 underline" href={t.sourceUrl.split(" ")[0]} target="_blank" rel="noreferrer">
                          출처
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["approved", "done", "skipped", "queued"] as const).map((st) => (
                    <button
                      key={st}
                      disabled={p.status === st}
                      onClick={async () => {
                        const note = st === "done" ? prompt("완료 메모(통화 결과 등, 선택)") || "" : undefined;
                        await api("/api/admin/packets", { method: "POST", body: JSON.stringify({ id: p.id, status: st, note }) });
                        await load();
                      }}
                      className="rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-slate-300 disabled:bg-civic-600 disabled:text-white disabled:ring-civic-600"
                    >
                      {{ approved: "승인", done: "완료", skipped: "건너뜀", queued: "대기로" }[st]}
                    </button>
                  ))}
                </div>
                {p.note && <p className="mt-2 text-xs text-slate-600">메모: {p.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-bold">게시글 관리</h2>
        {posts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">게시글이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {posts.map((p) => (
              <li key={p.id} className={`flex items-start justify-between gap-3 py-2 ${p.hidden ? "opacity-50" : ""}`}>
                <div className="text-sm">
                  <span className="text-xs text-slate-500">
                    [{p.stance}] {p.nickname} · {new Date(p.createdAt).toLocaleString("ko-KR")} · ip#{p.ipTag}
                  </span>
                  <p>{p.body}</p>
                </div>
                <button
                  onClick={async () => {
                    await api("/api/admin/posts", { method: "POST", body: JSON.stringify({ id: p.id, hidden: !p.hidden }) });
                    await load();
                  }}
                  className="shrink-0 rounded-md px-2 py-1 text-xs ring-1 ring-slate-300"
                >
                  {p.hidden ? "복원" : "숨김"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
