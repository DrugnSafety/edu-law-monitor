"use client";
import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";

type Status = {
  storage: string;
  mail: string;
  pickleMode: string;
  features: Record<string, boolean>;
  subscribers: { confirmed: number; pending: number };
  runs: { id: string; createdAt: string; trigger: string; verdict: string; headline: string; sources: { name: string; ok: boolean; detail: string }[] }[];
};
type Post = { id: string; createdAt: string; nickname: string; stance: string; body: string; hidden: boolean; ipTag: string };
type Target = { name: string; office: string; phone: string; sourceUrl: string; verified: boolean; sourceVerified?: boolean; alternates?: string[] };
type CallResult = { id: string; name: string; outcome: string; memo: string; recordedAt: string };
type Dispatch = { status: "sent" | "failed"; mode: string; at: string; messageIds: number[]; error?: string };
type Packet = {
  id: string;
  createdAt: string;
  milestone: number;
  supportCount: number;
  memos: { nickname: string; body: string }[];
  callScript: string;
  targets: Target[];
  targetsFallback?: boolean;
  status: string;
  note?: string;
  dispatchedAt?: string | null;
  telegramMessageId?: number | null;
  dispatches?: Dispatch[];
  callResults?: CallResult[];
};

const FEATURE_LABEL: Record<string, string> = {
  assembly: "국회 API",
  naver: "네이버 검색",
  llm: "Anthropic",
  email: "메일 발송",
  telegram: "텔레그램",
  postgres: "Postgres",
  admin: "ADMIN_TOKEN",
  cron: "CRON_SECRET",
};
const STATUS_LABEL: Record<string, string> = { queued: "대기", approved: "승인", done: "완료", skipped: "건너뜀" };
const OUTCOMES = ["통화완료", "부재", "거절"] as const;

const card = "rounded-md border border-rule bg-sheet p-4 sm:p-5";
const btn = "rounded-md border border-ink/20 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-ink disabled:opacity-60";
const btnPrimary = "rounded-md bg-ink px-4 py-2 text-sm font-bold text-white transition-colors duration-150 hover:bg-[#0b1325] disabled:opacity-60";
const field = "rounded-md border border-rule bg-sheet px-3 py-2 text-sm focus:border-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/80";

export default function AdminPanel() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [flash, setFlash] = useState("");

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
      setErr((e as Error).message === "unauthorized" ? "토큰이 맞지 않습니다. 로그아웃 후 다시 입력하세요." : (e as Error).message);
    }
  }, [api, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setFlash("");
    try {
      const m = await fn();
      if (m) setFlash(m);
      await load();
    } catch (e) {
      setFlash("실패: " + (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  if (!token)
    return (
      <form
        className="mx-auto mt-16 max-w-sm space-y-3 rounded-md border border-rule bg-sheet p-6"
        onSubmit={(e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get("token") || "");
          sessionStorage.setItem("elm_admin", v);
          setToken(v);
        }}
      >
        <h1 className="font-serif text-2xl font-bold">관리자</h1>
        <label htmlFor="adm-token" className="block text-sm font-semibold">
          관리자 토큰
        </label>
        <input id="adm-token" name="token" type="password" autoComplete="current-password" className={`w-full ${field}`} />
        <button className={`w-full ${btnPrimary}`}>들어가기</button>
      </form>
    );

  return (
    <div className="space-y-6 pt-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px] font-bold">관리자</h1>
        <button
          className="text-[13px] text-ink-3 underline hover:text-ink"
          onClick={() => {
            sessionStorage.removeItem("elm_admin");
            setToken("");
            setStatus(null);
          }}
        >
          로그아웃
        </button>
      </div>
      {err && <p className="rounded-md border border-seal/40 bg-seal-soft p-3 text-sm text-seal-ink">{err}</p>}
      <p aria-live="polite" className="min-h-[1.25rem] whitespace-pre-wrap text-sm font-medium text-ink">
        {flash}
      </p>

      {/* 상태 · 모니터 */}
      <section className={card} aria-labelledby="adm-mon">
        <h2 id="adm-mon" className="font-serif text-xl font-bold">
          모니터
        </h2>
        {status && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-rule-2 px-2 py-0.5">저장소 {status.storage}</span>
            <span className="rounded bg-rule-2 px-2 py-0.5">메일 {status.mail}</span>
            <span className="rounded bg-rule-2 px-2 py-0.5">피클 {status.pickleMode === "auto" ? "자동" : "승인"} 모드</span>
            {Object.entries(status.features).map(([k, v]) => (
              <span key={k} className={`rounded px-2 py-0.5 ${v ? "bg-grid-soft text-grid" : "bg-rule-2 text-ink-3"}`}>
                {FEATURE_LABEL[k] || k} {v ? "설정" : "미설정"}
              </span>
            ))}
            <span className="rounded bg-rule-2 px-2 py-0.5">
              구독 {status.subscribers.confirmed}명 (확인 대기 {status.subscribers.pending})
            </span>
          </div>
        )}
        <button
          disabled={!!busy}
          className={`mt-4 ${btnPrimary}`}
          onClick={() =>
            act("run", async () => {
              const r = await api("/api/admin/run", { method: "POST" });
              return `${r.headline}\n이벤트: ${r.events.join(" | ") || "없음"} · 메일 ${r.emailed}건 · 텔레그램 ${r.telegram}`;
            })
          }
        >
          {busy === "run" ? "확인 중…(최대 1분)" : "지금 모니터 실행"}
        </button>
        <ul className="mt-3 space-y-1 text-xs leading-relaxed text-ink-2">
          {status?.runs.map((r) => (
            <li key={r.id}>
              <b className="tnum">{fmtDateTime(r.createdAt)}</b> [{r.trigger}] {r.verdict} — {r.headline}
            </li>
          ))}
        </ul>
      </section>

      {/* 테스트 메일 */}
      <section className={card} aria-labelledby="adm-mail">
        <h2 id="adm-mail" className="font-serif text-xl font-bold">
          테스트 메일
        </h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const to = String(new FormData(e.currentTarget).get("to") || "");
            act("mail", async () => {
              const r = await api("/api/admin/test-email", { method: "POST", body: JSON.stringify({ to }) });
              return r.via === "outbox" ? "메일 발송 설정이 없어 outbox에만 기록했습니다." : `테스트 메일을 보냈습니다(${r.via}).`;
            });
          }}
        >
          <label htmlFor="adm-to" className="sr-only">
            받는 주소
          </label>
          <input id="adm-to" name="to" type="email" required autoComplete="email" spellCheck={false} placeholder="받는 주소…" className={`min-w-0 flex-1 ${field}`} />
          <button disabled={!!busy} className={btnPrimary}>
            {busy === "mail" ? "보내는 중…" : "테스트 메일 보내기"}
          </button>
        </form>
      </section>

      {/* 기타 의견 일일 요약 */}
      <section className={card} aria-labelledby="adm-op">
        <h2 id="adm-op" className="font-serif text-xl font-bold">
          기타 의견 일일 요약
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          매일 저녁 확인(21:10) 때, 지난 요약 이후 새로 들어온 ‘기타 의견’이 있으면 전건 원문과 요약을 운영자 메일(OPINION_DIGEST_TO)로 보냅니다. 새 의견이 없으면 보내지 않습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            disabled={!!busy}
            className={btnPrimary}
            onClick={() =>
              act("op", async () => {
                const r = await api("/api/admin/opinion-digest", { method: "POST", body: JSON.stringify({ onlyNew: true }) });
                return r.status === "sent" ? `새 기타 의견 ${r.count}건 요약을 보냈습니다(${r.to}).` : r.status === "skipped" ? `보내지 않음: ${r.reason}` : `실패: ${r.error}`;
              })
            }
          >
            {busy === "op" ? "보내는 중…" : "새 의견 요약 지금 보내기"}
          </button>
          <button
            disabled={!!busy}
            className={btn}
            onClick={() =>
              act("op", async () => {
                const r = await api("/api/admin/opinion-digest", { method: "POST", body: JSON.stringify({ onlyNew: false }) });
                return r.status === "sent" ? `전체 기타 의견 ${r.count}건 요약을 보냈습니다(${r.to}).` : r.status === "skipped" ? `보내지 않음: ${r.reason}` : `실패: ${r.error}`;
              })
            }
          >
            전체 의견 다시 받기
          </button>
        </div>
      </section>

      {/* 마일스톤 */}
      <section className={card} aria-labelledby="adm-pk">
        <h2 id="adm-pk" className="font-serif text-xl font-bold">
          마일스톤 · 피클 통화
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
          지지 100개마다 패킷이 생기고 텔레그램 그룹에 통화 작업이 올라갑니다. 승인 모드에서는 그룹에서 ‘승인’ 답장이 있어야 피클이 시작합니다. 통화 결과를 아래에 기록하면 타임라인에 공개됩니다(개인정보 금지).
        </p>
        {packets.length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">아직 패킷이 없습니다. 지지 메모 100개마다 생깁니다.</p>
        ) : (
          <ul className="mt-4 space-y-5">
            {packets.map((p) => (
              <li key={p.id} className="rounded-md border border-rule p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-serif text-lg font-bold">
                    지지 {p.milestone}개 <span className="text-[13px] font-normal text-ink-3">생성 {fmtDateTime(p.createdAt)} · 당시 {p.supportCount}개</span>
                  </p>
                  <span className="rounded bg-rule-2 px-2 py-0.5 text-xs font-semibold">{STATUS_LABEL[p.status] ?? p.status}</span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
                  {p.dispatchedAt ? (
                    <span className="rounded bg-grid-soft px-2 py-0.5 text-grid">
                      텔레그램 보냄 {fmtDateTime(p.dispatchedAt)}
                      {p.telegramMessageId ? ` · 메시지 #${p.telegramMessageId}` : ""}
                    </span>
                  ) : (
                    <span className="rounded bg-amber-soft px-2 py-0.5 text-amber-ink">텔레그램 미발송</span>
                  )}
                  {p.dispatches?.length ? (
                    <span className="text-ink-3">
                      시도 {p.dispatches.length}회
                      {p.dispatches[p.dispatches.length - 1].status === "failed" ? ` · 마지막 실패: ${p.dispatches[p.dispatches.length - 1].error}` : ""}
                    </span>
                  ) : null}
                  <button
                    disabled={!!busy}
                    className={btn}
                    onClick={() => {
                      if (!confirm(`지지 ${p.milestone}개 통화 작업을 텔레그램 그룹에 다시 보냅니다. 계속할까요?`)) return;
                      act(`d-${p.id}`, async () => {
                        const r = await api("/api/admin/packets/dispatch", { method: "POST", body: JSON.stringify({ id: p.id }) });
                        return r.dryRun ? "드라이런: 콘솔에만 출력했습니다." : "텔레그램에 다시 보냈습니다.";
                      });
                    }}
                  >
                    {busy === `d-${p.id}` ? "보내는 중…" : "다시 보내기"}
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["approved", "done", "skipped", "queued"] as const).map((st) => (
                    <button
                      key={st}
                      disabled={p.status === st || !!busy}
                      onClick={() => act(`s-${p.id}`, async () => void (await api("/api/admin/packets", { method: "POST", body: JSON.stringify({ id: p.id, status: st }) })))}
                      className={`${btn} disabled:border-ink disabled:bg-ink disabled:text-white disabled:opacity-100`}
                    >
                      {STATUS_LABEL[st]}
                    </button>
                  ))}
                </div>

                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-ink hover:underline">대표 메모 · 통화 문안</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-ink-2">
                    {p.memos.map((m, i) => (
                      <li key={i}>{m.body}</li>
                    ))}
                  </ul>
                  <p className="mt-2 whitespace-pre-wrap rounded bg-paper p-3 text-[13px] leading-relaxed">{p.callScript}</p>
                </details>

                <h3 className="mt-4 text-sm font-semibold">
                  통화 대상 {p.targets.length}곳 {p.targetsFallback && <span className="text-amber-ink">(출처 확인 번호 없음 — 전체 후보)</span>}
                </h3>
                <ul className="mt-2 divide-y divide-rule border-y border-rule">
                  {p.targets.map((t) => {
                    const results = (p.callResults || []).filter((r) => r.name === t.name);
                    const key = `r-${p.id}-${t.name}`;
                    return (
                      <li key={t.name} className="py-3">
                        <p className="text-sm">
                          <b>{t.name}</b> <span className="text-ink-3">{t.office}</span> <span className="tnum font-semibold">{t.phone}</span>
                          {t.alternates?.length ? <span className="text-ink-3"> · 대체 {t.alternates.join(", ")}</span> : null}{" "}
                          <a className="text-[13px] underline" href={t.sourceUrl.split(" ")[0]} target="_blank" rel="noreferrer">
                            출처
                          </a>
                        </p>
                        {results.length > 0 && (
                          <ul className="mt-1 text-[13px] text-ink-2">
                            {results.map((r) => (
                              <li key={r.id}>
                                {fmtDateTime(r.recordedAt)} · <b>{r.outcome}</b>
                                {r.memo ? ` — ${r.memo}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                        <form
                          className="mt-2 flex flex-wrap items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const form = e.currentTarget;
                            act(key, async () => {
                              await api("/api/admin/packets/result", { method: "POST", body: JSON.stringify({ id: p.id, name: t.name, outcome: fd.get("outcome"), memo: fd.get("memo") }) });
                              form.reset();
                              return `${t.name} 결과를 기록했습니다. 타임라인에 공개됩니다.`;
                            });
                          }}
                        >
                          <fieldset className="flex gap-1">
                            <legend className="sr-only">{t.name} 통화 결과</legend>
                            {OUTCOMES.map((o, i) => (
                              <label key={o} className="cursor-pointer rounded border border-rule px-2 py-1 text-[13px] has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink">
                                <input type="radio" name="outcome" value={o} required defaultChecked={i === 0} className="sr-only" />
                                {o}
                              </label>
                            ))}
                          </fieldset>
                          <label className="sr-only" htmlFor={`${key}-memo`}>
                            공개 메모
                          </label>
                          <input id={`${key}-memo`} name="memo" maxLength={140} autoComplete="off" placeholder="공개 메모(개인정보 금지)…" className={`min-w-0 flex-1 ${field} py-1.5`} />
                          <button disabled={!!busy} className={btn}>
                            {busy === key ? "기록 중…" : "결과 기록"}
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 게시글 */}
      <section className={card} aria-labelledby="adm-posts">
        <h2 id="adm-posts" className="font-serif text-xl font-bold">
          게시글 관리
        </h2>
        {posts.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">게시글이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-rule">
            {posts.map((p) => (
              <li key={p.id} className={`flex items-start justify-between gap-3 py-2.5 ${p.hidden ? "opacity-50" : ""}`}>
                <div className="min-w-0 text-sm">
                  <span className="text-xs text-ink-3">
                    [{p.stance === "support" ? "지지" : "의견"}] {p.nickname} · {fmtDateTime(p.createdAt)} · ip#{p.ipTag}
                  </span>
                  <p className="break-words">{p.body}</p>
                </div>
                <button
                  disabled={!!busy}
                  onClick={() => act(`p-${p.id}`, async () => void (await api("/api/admin/posts", { method: "POST", body: JSON.stringify({ id: p.id, hidden: !p.hidden }) })))}
                  className={`shrink-0 ${btn}`}
                >
                  {p.hidden ? "다시 보이기" : "숨기기"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
