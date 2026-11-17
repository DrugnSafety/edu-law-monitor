import Board from "@/components/Board";
import Subscribe from "@/components/Subscribe";
import { Card, ExtLink, Pill, StageBar, VerdictBadge } from "@/components/ui";
import { boardStats, listPublicPosts } from "@/lib/board";
import { daysBetween, featureFlags, fmtKst, kstDate, MANUAL_CHECK_LINKS, SESSION_END } from "@/lib/config";
import { latestRun } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [run, posts, stats] = await Promise.all([latestRun(), listPublicPosts(60), boardStats()]);
  const flags = featureFlags();
  const today = kstDate();
  const dday = daysBetween(today, SESSION_END);
  const upcoming = (run?.meetings || []).filter((m) => m.date >= today);
  const alt = run?.alternatives?.[0];

  return (
    <div className="space-y-5">
      {sp.subscribed && <Notice ok={sp.subscribed === "1"} text={sp.subscribed === "1" ? "구독이 완료되었습니다." : "구독 확인 링크가 유효하지 않습니다."} />}
      {sp.unsubscribed && <Notice ok={sp.unsubscribed === "1"} text={sp.unsubscribed === "1" ? "구독이 해지되었습니다." : "해지 링크가 유효하지 않습니다."} />}

      <section className="rounded-xl bg-gradient-to-br from-civic-800 to-civic-900 p-5 text-white shadow">
        <p className="text-xs font-medium text-civic-100/80">교육공무원법 일부개정법률안(대안) · 사립학교법 대안 동반 추적</p>
        <h1 className="mt-1 text-xl font-extrabold leading-snug sm:text-2xl">
          교원 육아휴직 대상 자녀
          <br className="sm:hidden" /> 만 8세 → <span className="text-amber-300">만 12세(초6)</span> 확대
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-1">정기회 종료(12/9) {dday >= 0 ? `D-${dday}` : "종료"}</span>
          <span className="rounded-full bg-white/10 px-3 py-1">대안 의안번호: {alt ? alt.billNo : "미등록"}</span>
        </div>
      </section>

      <Card title="입법 진행 단계" right={<VerdictBadge verdict={run?.verdict ?? null} />}>
        <StageBar stages={run?.stages ?? null} />
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-800">{run ? run.headline : "아직 모니터가 실행되지 않았습니다. 첫 실행 후 판정이 표시됩니다."}</p>
          {run && <p className="mt-1 text-xs text-slate-500">마지막 확인: {fmtKst(run.createdAt)}</p>}
          {run && run.uncertainties.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-amber-900">
              {run.uncertainties.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          )}
          {run && run.verdict === "uncertain" && (
            <p className="mt-2 text-xs text-slate-600">
              직접 확인:{" "}
              {MANUAL_CHECK_LINKS.map((l, i) => (
                <span key={l.url}>
                  {i > 0 && " · "}
                  <ExtLink href={l.url}>{l.label}</ExtLink>
                </span>
              ))}
            </p>
          )}
        </div>
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          <li>① 2026-11-17 제439회 제1차 교육위 법안심사소위: 교육공무원법 4건(김선교·한정애·위성곤·김희정안)·사립학교법 3건 대안반영폐기 의결</li>
          {run?.notes.map((n) => (
            <li key={n} className="text-slate-500">· {n}</li>
          ))}
        </ul>
      </Card>

      <Card title="응원 게시판" right={<span className="text-xs text-slate-500">한 줄 메모 · 200자</span>} className="ring-2 ring-civic-100" >
        <Board initialPosts={posts} initialStats={stats} />
      </Card>

      <Card title="다가오는 관련 회의" right={<span className="text-xs text-slate-500">교육위·법사위·본회의, 향후 7일</span>}>
        {!run ? (
          <p className="text-sm text-slate-500">모니터 실행 후 표시됩니다.</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">향후 7일 내 등록된 교육위 전체회의·법안소위·법사위·본회의 일정이 아직 없습니다(국회 API 기준).</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((m) => (
              <li key={m.key} className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {m.date.slice(5).replace("-", "/")} {m.time} · {m.body}
                  </p>
                  <p className="text-xs text-slate-500">{m.title}</p>
                  {m.matchedItems.length > 0 && <p className="mt-1 text-xs text-civic-700">{m.matchedItems.join(" / ")}</p>}
                </div>
                <div className="shrink-0 text-right">
                  {m.relevant === true ? <Pill tone="red">대상 안건 포함</Pill> : m.relevant === false ? <Pill>대상 안건 없음</Pill> : <Pill tone="amber">안건 미공지/불명확</Pill>}
                  {m.link && (
                    <p className="mt-1 text-[11px]">
                      <ExtLink href={m.link}>일정</ExtLink>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="향후 전망" right={<Pill tone="amber">추정</Pill>}>
        <p className="text-sm leading-relaxed text-slate-700">{run?.outlook.text ?? "[추정] 소위 의결 대안은 교육위 전체회의 의결 → 법사위 체계·자구심사 → 본회의 순으로 진행됩니다. 정기회 종료(12/9) 전 본회의 상정 여부가 관건입니다."}</p>
        <p className="mt-2 text-[11px] text-slate-500">일반 입법 절차에 근거한 예상이며 확인된 사실이 아닙니다.{run?.outlook.generatedBy === "llm" ? " (AI 요약)" : ""}</p>
      </Card>


      <Card title="변화가 생기면 이메일로 알려드려요">
        <Subscribe emailConfigured={flags.email} />
      </Card>
    </div>
  );
}

function Notice({ ok, text }: { ok: boolean; text: string }) {
  return <div className={`rounded-lg px-4 py-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{text}</div>;
}
