import { Suspense } from "react";
import Board from "@/components/Board";
import QueryNotice from "@/components/QueryNotice";
import Subscribe from "@/components/Subscribe";
import { EstimateBox, ExtLink, GradeStrip, SectionHead, StageTracker, Tag, VerdictBadge } from "@/components/ui";
import { boardStats, listPublicPosts } from "@/lib/board";
import { CHECK_TIMES_KST, daysBetween, featureFlags, kstDate, MANUAL_CHECK_LINKS, SESSION_END, STAGES } from "@/lib/config";
import { latestRun } from "@/lib/data";
import { fmtDateTime, fmtLongDate, splitYmd } from "@/lib/format";
import type { Meeting } from "@/lib/types";

// 하루 3회 크론 + 메모 작성 시 즉시 재생성(revalidatePath). 브라우저 폴링 없음.
export const revalidate = 1800;

export default async function Home() {
  const [run, posts, stats] = await Promise.all([latestRun(), listPublicPosts(60).catch(() => []), boardStats().catch(() => ({ total: 0, support: 0, other: 0, nextMilestone: 100, progress: 0 }))]);
  const flags = featureFlags();
  const today = kstDate();
  const dday = daysBetween(today, SESSION_END);
  const upcoming = (run?.meetings || []).filter((m) => m.date >= today);
  const alt = run?.alternatives?.[0];
  const stage = run?.stage ?? 1;
  const remaining = STAGES.filter((s) => s.n > stage && s.n <= 4).map((s) => s.short);
  const [headMain, headDetail] = splitHeadline(run?.headline);

  return (
    <div>
      <div className="pt-4 empty:hidden">
        <Suspense fallback={null}>
          <QueryNotice />
        </Suspense>
      </div>

      {/* ── 논지 ── */}
      <section aria-labelledby="hero-h" className="grid items-start gap-10 pb-12 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-16 lg:pt-16">
        <div>
          <p className="text-[13px] font-semibold text-grid">교육공무원법 제44조(휴직) · 위원회 대안</p>
          <h1 id="hero-h" className="mt-3 font-serif text-[40px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[60px]">
            교원 육아휴직,
            <br />
            초등학교 <span className="marker">6학년</span>까지.
          </h1>
          <p className="mt-5 max-w-[34em] text-[17px] leading-[1.75] text-ink-2">
            국회 교육위원회 법안소위가 <b className="font-semibold text-ink">11월 17일</b> 육아휴직 대상 자녀를 만 12세까지 넓히는 대안을 의결했습니다.
            {remaining.length > 0 ? (
              <>
                {" "}
                남은 관문은 <b className="font-semibold text-ink">{remaining.join(" → ")}</b>. 정기회는 <b className="font-semibold text-seal-ink">12월 9일</b>에 끝납니다.
              </>
            ) : (
              " 국회 본회의 의결 이후 단계는 아래 표에서 확인하세요."
            )}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#board" className="rounded-md bg-ink px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-[#0b1325]">
              응원 메모 남기기
            </a>
            <a href="#subscribe" className="rounded-md border border-ink/25 bg-sheet px-5 py-3 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink">
              변화 알림 받기
            </a>
          </div>
        </div>
        <div className="lg:pt-3">
          <GradeStrip />
          <p className="mt-5 border-t border-rule pt-3 text-[13px] leading-relaxed text-ink-2">
            육아휴직 대상 자녀: <s className="decoration-ink-3">만 8세 이하(초등학교 2학년 이하)</s> → <span className="font-semibold text-ink">만 12세 이하(초등학교 6학년 이하)</span>. 사립학교 교원에게 같은 기준을 적용하는 사립학교법 대안도 함께 추적합니다.
          </p>
        </div>
      </section>

      {/* ── 현재 단계 ── */}
      <section aria-labelledby="status-h" className="border-t border-rule pb-14 pt-10">
        <SectionHead
          id="status-h"
          eyebrow="입법 진행 단계 ①~⑦"
          title="지금 어디까지 왔나"
          right={
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
              <VerdictBadge verdict={run?.verdict ?? null} />
              {run && (
                <span>
                  마지막 확인 <time className="tnum" dateTime={run.createdAt}>{fmtDateTime(run.createdAt)}</time>
                </span>
              )}
            </div>
          }
        />
        <StageTracker stages={run?.stages ?? null} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div>
            <p className="text-[16px] font-semibold leading-relaxed text-ink">{headMain ?? "아직 자동 확인 기록이 없습니다. 첫 확인 후 판정이 표시됩니다."}</p>
            {headDetail && <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{headDetail}</p>}
            {run && run.uncertainties.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-md border border-amber-ink/25 bg-amber-soft px-4 py-3 text-sm text-amber-ink">
                {run.uncertainties.map((u) => (
                  <li key={u}>· {u}</li>
                ))}
              </ul>
            )}
            {run?.verdict === "uncertain" && (
              <p className="mt-2 text-[13px] text-ink-2">
                직접 확인:{" "}
                {MANUAL_CHECK_LINKS.map((l, i) => (
                  <span key={l.url}>
                    {i > 0 && " · "}
                    <ExtLink href={l.url}>{l.label}</ExtLink>
                  </span>
                ))}
              </p>
            )}
            <details className="group mt-4 text-[13px] text-ink-2">
              <summary className="cursor-pointer select-none font-semibold text-ink hover:underline">판정 근거와 메모</summary>
              <ul className="mt-2 space-y-1 border-l-2 border-rule pl-3 leading-relaxed">
                <li>① 2026-11-17 제439회 제1차 교육위 법안심사소위: 교육공무원법 4건(김선교·한정애·위성곤·김희정안)·사립학교법 3건 대안반영폐기 의결</li>
                {run?.stages
                  .filter((s) => s.status !== "pending" && s.n > 1)
                  .map((s) => (
                    <li key={s.n}>
                      {"①②③④⑤⑥⑦"[s.n - 1]} {s.label}: {s.evidence}
                    </li>
                  ))}
                {run?.notes.map((n) => (
                  <li key={n}>· {n}</li>
                ))}
              </ul>
            </details>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 self-start rounded-md border border-rule bg-sheet p-4 text-[13px] lg:grid-cols-1">
            <div>
              <dt className="text-ink-3">대안 의안번호</dt>
              <dd className="mt-0.5 font-semibold text-ink">{alt ? alt.link ? <ExtLink href={alt.link}>{alt.billNo}</ExtLink> : <span className="tnum">{alt.billNo}</span> : "아직 미등록"}</dd>
            </div>
            <div>
              <dt className="text-ink-3">정기회 종료</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                12월 9일 <span className="tnum text-seal-ink">{dday > 0 ? `D-${dday}` : dday === 0 ? "오늘" : "지남"}</span>
              </dd>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <dt className="text-ink-3">자동 확인</dt>
              <dd className="mt-0.5 font-semibold text-ink">
                하루 3회 <span className="tnum">{CHECK_TIMES_KST.join(" · ")}</span>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ── 응원 게시판(메인) ── */}
      <section id="board" aria-labelledby="board-h" className="-mx-5 scroll-mt-4 border-y border-rule bg-[#f8faf6] px-5 py-10 sm:mx-0 sm:rounded-xl sm:border sm:px-8 sm:py-12 [background-image:linear-gradient(var(--color-rule-2)_1px,transparent_1px),linear-gradient(90deg,var(--color-rule-2)_1px,transparent_1px)] [background-size:24px_24px]">
        <SectionHead id="board-h" eyebrow="응원 게시판" title="메모 한 줄이 한 칸을 채웁니다" right={<p className="text-[13px] text-ink-3">200자 메모 · 닉네임 선택 · 로그인 없음</p>} />
        <Board initialPosts={posts} initialStats={stats} />
      </section>

      {/* ── 회의 · 전망 ── */}
      <section aria-labelledby="next-h" className="grid gap-10 pb-14 pt-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-12">
        <div>
          <SectionHead id="next-h" eyebrow="교육위 · 법사위 · 본회의, 향후 7일" title="다가오는 회의" />
          {!run ? (
            <p className="text-sm text-ink-2">첫 자동 확인 후 표시됩니다.</p>
          ) : upcoming.length === 0 ? (
            <p className="rounded-md border border-dashed border-ink-3/50 px-4 py-5 text-[15px] leading-relaxed text-ink-2">
              향후 7일 안에 국회 API에 올라온 교육위·법사위·본회의 일정이 없습니다. 일정이 올라오면 다음 확인({CHECK_TIMES_KST.join(" · ")}) 때 여기에 표시합니다.
            </p>
          ) : (
            <ul className="divide-y divide-rule border-y border-rule">
              {upcoming.map((m) => (
                <MeetingRow key={m.key} m={m} />
              ))}
            </ul>
          )}
        </div>
        <div className="lg:pt-[3.75rem]">
          <EstimateBox>
            <p className="text-[15px] leading-[1.8] text-ink">
              {(run?.outlook.text ?? "[추정] 소위가 의결한 대안은 교육위 전체회의 의결 → 법사위 체계·자구 심사 → 본회의 순으로 진행됩니다. 정기회 종료(12/9) 전 본회의 상정 여부가 관건입니다.").replace(/^\[추정\]\s*/, "")}
            </p>
            <p className="mt-3 text-xs text-ink-3">일반 입법 절차에 근거한 예상이며 확인된 사실이 아닙니다.{run?.outlook.generatedBy === "llm" ? " AI가 정리했습니다." : ""}</p>
          </EstimateBox>
        </div>
      </section>

      {/* ── 알림 ── */}
      <section id="subscribe" aria-labelledby="sub-h" className="scroll-mt-4 border-t border-rule pt-10">
        <div className="grid items-start gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
          <SectionHead id="sub-h" eyebrow="이메일 알림" title="단계가 바뀌면 메일로 알려 드립니다" />
          <Subscribe emailConfigured={flags.email} />
        </div>
      </section>
    </div>
  );
}

function splitHeadline(h?: string): [string | null, string | null] {
  if (!h) return [null, null];
  const i = h.indexOf(" (");
  if (i > 0 && h.endsWith(")")) return [h.slice(0, i), h.slice(i + 2, -1)];
  return [h, null];
}

function MeetingRow({ m }: { m: Meeting }) {
  const d = splitYmd(m.date);
  return (
    <li className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 py-3.5">
      <div className="text-center">
        <p className="tnum font-serif text-xl font-bold leading-none text-ink">{d.md}</p>
        <p className="mt-1 text-xs text-ink-3">
          {d.wd}
          {m.time ? ` ${m.time}` : ""}
        </p>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-ink">{m.body}</p>
          {m.relevant === true ? <Tag tone="seal">대상 안건 포함</Tag> : m.relevant === false ? <Tag>대상 안건 없음</Tag> : <Tag tone="amber">안건 미공지</Tag>}
        </div>
        <p className="mt-0.5 text-[13px] text-ink-3">{m.title}</p>
        {m.matchedItems.length > 0 && <p className="mt-1 text-[13px] text-ink-2">{m.matchedItems.join(" / ")}</p>}
        {m.link && (
          <p className="mt-1 text-[13px]">
            <ExtLink href={m.link}>회의 일정 원문</ExtLink>
          </p>
        )}
        <span className="sr-only">{fmtLongDate(m.date)}</span>
      </div>
    </li>
  );
}
