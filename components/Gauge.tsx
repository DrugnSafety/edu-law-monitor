// 서버·클라이언트 공용(훅 없음). 지지 메모 1개 = 원고지 1칸, 100칸 = 피클 전화 1회.
import { fmtNum } from "@/lib/format";

export type BoardStats = { total: number; support: number; other: number; nextMilestone: number; progress: number };

export function gaugeState(s: BoardStats) {
  const prev = s.nextMilestone - 100;
  let filled = s.support - prev;
  const justHit = filled === 0 && s.support > 0;
  if (justHit) filled = 100;
  return { filled, remaining: justHit ? 0 : 100 - filled, justHit, target: justHit ? s.support : s.nextMilestone };
}

export function MilestoneGauge({ stats, newCell = false, compact = false }: { stats: BoardStats; newCell?: boolean; compact?: boolean }) {
  const g = gaugeState(stats);
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-grid">빠른 입법 지지</p>
          <p className="mt-0.5 font-serif font-bold leading-none tracking-tight text-ink">
            <span className={`tnum ${compact ? "text-[44px]" : "text-[56px] sm:text-[64px]"}`}>{fmtNum(stats.support)}</span>
            <span className="ml-1 text-lg text-ink-2">개</span>
          </p>
        </div>
        <p className="pb-1 text-right text-[13px] leading-snug text-ink-2">
          {g.justHit ? (
            <>
              <b className="text-seal-ink">{fmtNum(g.target)}개 달성</b>
              <br />
              피클 전화 준비 중
            </>
          ) : (
            <>
              다음 전화까지
              <br />
              <b className="tnum font-serif text-2xl text-ink">{g.remaining}</b>개
            </>
          )}
        </p>
      </div>

      <div
        className="mt-3 grid border-l border-t border-grid/40 bg-sheet"
        style={{ gridTemplateColumns: "repeat(20, minmax(0, 1fr))" }}
        role="img"
        aria-label={`다음 전화까지 100칸 중 ${g.filled}칸 채움`}
      >
        {Array.from({ length: 100 }, (_, i) => {
          const on = i < g.filled;
          const isNewest = newCell && i === g.filled - 1;
          const isNext = !g.justHit && i === g.filled;
          return (
            <span
              key={i}
              className={`aspect-square border-b border-r border-grid/40 ${on ? (isNewest ? "cell-new bg-seal" : "bg-ink") : ""} ${
                isNext ? "outline-[1.5px] -outline-offset-[3px] outline-dashed outline-seal" : ""
              }`}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink-3" aria-hidden="true">
        <span className="tnum">{fmtNum(g.target - 100)}</span>
        <span className="tnum">{fmtNum(g.target)} → 피클 전화</span>
      </div>
    </div>
  );
}

/** 피클 약속 문장(짧은 판) */
export function PicklePromise({ link = true }: { link?: boolean }) {
  return (
    <div className="flex gap-3 rounded-md border border-seal/30 bg-sheet p-4">
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" className="mt-0.5 shrink-0 text-seal">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 3.5h3.2l1.6 4.2-2.1 1.4a11 11 0 0 0 5.2 5.2l1.4-2.1 4.2 1.6V17a2.5 2.5 0 0 1-2.7 2.5C9.4 18.9 5.1 14.6 4.5 8.2A2.5 2.5 0 0 1 5 3.5Z"
        />
      </svg>
      <div>
        <p className="font-serif text-[16px] leading-relaxed text-ink sm:text-[17px]">
          빠른 입법 지지 메모가 <b>100개</b> 모일 때마다, 교육위원회 국회의원 지역사무실에 AI 비서 ‘피클(Pickle)’이 여러분의 목소리를 모아 전화를 겁니다.
        </p>
        {link && (
          <a href="/act#pickle" className="mt-1.5 inline-block rounded text-[13px] font-semibold text-seal-ink underline decoration-seal/40 underline-offset-[3px] hover:decoration-seal">
            무엇을 어떻게 전하나요?
          </a>
        )}
      </div>
    </div>
  );
}
