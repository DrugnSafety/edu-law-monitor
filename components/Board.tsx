"use client";
import { useRef, useState } from "react";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { MilestoneGauge, PicklePromise, type BoardStats } from "./Gauge";

type Post = { id: string; createdAt: string; nickname: string; stance: "support" | "other"; body: string };
type Filter = "all" | "support" | "other";

const MAX = 200;

export default function Board({ initialPosts, initialStats }: { initialPosts: Post[]; initialStats: BoardStats }) {
  const [posts, setPosts] = useState(initialPosts);
  const [stats, setStats] = useState(initialStats);
  const [stance, setStance] = useState<"support" | "other">("support");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [fresh, setFresh] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (!body.trim()) {
      setStatus({ ok: false, text: "메모 내용을 입력하세요." });
      bodyRef.current?.focus();
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: fd.get("nickname"), stance, body, website: fd.get("website") }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "메모를 남기지 못했습니다. 잠시 후 다시 시도하세요.");
      setPosts((p) => [j.post, ...p]);
      setStats(j.stats);
      setFresh(j.post.id);
      setBody("");
      setStatus({
        ok: true,
        text: j.milestone
          ? `${fmtNum(j.milestone)}번째 지지 메모입니다. 피클이 교육위원 지역사무실에 전화할 준비를 시작합니다.`
          : stance === "support"
            ? `메모를 남겼습니다. 빠른 입법 지지 ${fmtNum(j.stats.support)}번째 메모입니다.`
            : "메모를 남겼습니다.",
      });
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
      bodyRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch("/api/posts?limit=300");
      const j = await res.json();
      if (Array.isArray(j.posts)) setPosts(j.posts);
    } finally {
      setLoadingMore(false);
    }
  }

  const shown = posts.filter((p) => filter === "all" || p.stance === filter);
  const counts: Record<Filter, number> = { all: stats.total, support: stats.support, other: stats.other };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-12">
      {/* 왼쪽: 게이지 · 약속 · 작성 */}
      <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <MilestoneGauge stats={stats} newCell={!!fresh && stance === "support"} />
        <PicklePromise />

        <form onSubmit={submit} className="rounded-md border border-ink/15 bg-sheet p-4 shadow-[0_1px_0_rgba(22,33,58,0.05)] sm:p-5" aria-labelledby="compose-h" noValidate>
          <h3 id="compose-h" className="font-serif text-lg font-bold">
            메모 남기기
          </h3>
          <fieldset className="mt-3">
            <legend className="sr-only">입장</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["support", "빠른 입법 지지", "100칸 게이지에 1칸"],
                  ["other", "기타 의견", "게이지에 세지 않음"],
                ] as const
              ).map(([v, l, d]) => (
                <label
                  key={v}
                  className={`cursor-pointer rounded-md border px-3 py-2.5 transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${
                    stance === v ? "border-ink bg-ink text-white" : "border-rule bg-sheet text-ink hover:border-ink-3"
                  }`}
                >
                  <input type="radio" name="stance" value={v} checked={stance === v} onChange={() => setStance(v)} className="sr-only" />
                  <span className="block text-[15px] font-semibold">{l}</span>
                  <span className={`block text-xs ${stance === v ? "text-white/75" : "text-ink-3"}`}>{d}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <label htmlFor="memo-body" className="text-sm font-semibold">
                메모
              </label>
              <span className={`tnum text-xs ${body.length >= MAX ? "font-semibold text-seal-ink" : "text-ink-3"}`} aria-hidden="true">
                {body.length}/{MAX}자
              </span>
            </div>
            <textarea
              id="memo-body"
              ref={bodyRef}
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX))}
              rows={4}
              maxLength={MAX}
              autoComplete="off"
              aria-describedby="memo-hint"
              aria-invalid={status && !status.ok ? true : undefined}
              placeholder={stance === "support" ? "예) 초등 고학년도 돌봄이 필요합니다. 이번 정기회에 꼭 통과시켜 주세요…" : "의견을 한두 줄로 남겨 주세요…"}
              className="ruled mt-1.5 block w-full resize-none rounded-md border border-rule bg-sheet px-3 py-[calc((1.875rem-1.4em)/2)] font-serif text-[16px] text-ink placeholder:text-ink-3/80 focus:border-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/80"
            />
            <p id="memo-hint" className="mt-1.5 text-xs leading-relaxed text-ink-3">
              200자 이내. 전화번호·주소 같은 개인정보는 적지 마세요. 링크는 올릴 수 없고, 욕설·비방은 숨겨질 수 있습니다.
            </p>
          </div>

          <div className="mt-3">
            <label htmlFor="memo-nick" className="text-sm font-semibold">
              닉네임 <span className="font-normal text-ink-3">(선택, 비우면 ‘익명’)</span>
            </label>
            <input
              id="memo-nick"
              name="nickname"
              maxLength={20}
              autoComplete="nickname"
              spellCheck={false}
              placeholder="예) 초5 아빠 교사…"
              className="mt-1.5 block w-full rounded-md border border-rule bg-sheet px-3 py-2.5 text-[15px] placeholder:text-ink-3/80 focus:border-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/80"
            />
          </div>
          {/* 봇 차단용 숨은 칸 */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              웹사이트
              <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-md bg-ink px-4 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-[#0b1325] active:translate-y-px disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? "남기는 중…" : "메모 남기기"}
          </button>
          <p aria-live="polite" role={status && !status.ok ? "alert" : undefined} className={`mt-2 min-h-[1.25rem] text-sm font-medium ${status?.ok ? "text-grid" : "text-seal-ink"}`}>
            {status?.text}
          </p>
        </form>
      </div>

      {/* 오른쪽: 메모 벽 */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-bold">
            모인 메모 <span className="tnum text-ink-2">{fmtNum(stats.total)}</span>
          </h3>
          <div className="flex gap-1 text-sm" role="group" aria-label="메모 거르기">
            {(
              [
                ["all", "전체"],
                ["support", "지지"],
                ["other", "의견"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
                className={`rounded-md px-2.5 py-1.5 transition-colors duration-150 ${filter === v ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-rule-2"}`}
              >
                {l} <span className="tnum opacity-75">{fmtNum(counts[v])}</span>
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-md border border-dashed border-ink-3/50 bg-sheet/60 px-6 py-10 text-center">
            <p className="font-serif text-lg text-ink">{filter === "other" ? "아직 기타 의견이 없습니다." : "아직 메모가 없습니다."}</p>
            <p className="mt-1 text-sm text-ink-2">첫 메모가 게이지의 첫 칸을 채웁니다.</p>
          </div>
        ) : (
          <ul className="gap-3 sm:columns-2 [&>li]:mb-3">
            {shown.map((p) => (
              <li key={p.id} className={`break-inside-avoid rounded-md border border-ink/10 bg-sheet shadow-[0_1px_0_rgba(22,33,58,0.06)] ${p.id === fresh ? "memo-new ring-2 ring-marker" : ""}`}>
                <div className="flex items-center gap-2 px-4 pt-3 text-[13px]">
                  {p.stance === "support" ? <MiniSeal /> : <span className="rounded border border-rule px-1.5 text-xs font-semibold text-ink-2">의견</span>}
                  <span className="min-w-0 truncate font-semibold text-ink">{p.nickname}</span>
                  <time dateTime={p.createdAt} className="tnum ml-auto shrink-0 text-xs text-ink-3">
                    {fmtDateTime(p.createdAt)}
                  </time>
                </div>
                <p className="ruled whitespace-pre-wrap break-words px-4 pb-3 font-serif text-[16px] text-ink [--ruled-offset:0px]">{p.body}</p>
              </li>
            ))}
            {filter !== "other" && shown.length < 6 && (
              <li className="break-inside-avoid rounded-md border border-dashed border-seal/50 bg-sheet/50 px-4 py-5">
                <p className="font-serif text-[16px] text-ink">다음 메모가 붙을 자리입니다.</p>
                <p className="mt-1 text-[13px] text-ink-2">지지 메모 한 줄이 게이지의 다음 칸을 채웁니다.</p>
                <button
                  type="button"
                  onClick={() => {
                    bodyRef.current?.focus();
                    bodyRef.current?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                  }}
                  className="mt-3 rounded-md border border-ink/25 px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-ink"
                >
                  메모 쓰기
                </button>
              </li>
            )}
          </ul>
        )}
        {posts.length < Math.min(stats.total, 300) && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-2 w-full rounded-md border border-ink/20 bg-sheet py-2.5 text-sm font-semibold text-ink transition-colors duration-150 hover:border-ink disabled:opacity-70"
          >
            {loadingMore ? "불러오는 중…" : `메모 더 보기 (최근 ${fmtNum(Math.min(stats.total, 300))}개까지)`}
          </button>
        )}
      </div>
    </div>
  );
}

function MiniSeal() {
  return (
    <span className="inline-flex h-[26px] w-[26px] shrink-0 -rotate-6 items-center justify-center rounded-full border-[1.5px] border-seal font-serif text-[10px] font-bold leading-none text-seal" title="빠른 입법 지지">
      지지
    </span>
  );
}
