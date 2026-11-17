import { STAGES, VERDICTS, type Verdict } from "@/lib/config";
import { splitYmd } from "@/lib/format";
import type { StageInfo } from "@/lib/types";

/* ───────── 표식 ───────── */

/** 사이트 표식: 인주색 네모 도장 안의 12 */
export function SealMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="shrink-0 text-seal">
      <g filter="url(#ink)">
        <rect x="1.5" y="1.5" width="37" height="37" rx="5" fill="currentColor" />
        <rect x="5" y="5" width="30" height="30" rx="2.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
        <text x="20" y="27.5" textAnchor="middle" fontSize="19" fontWeight="700" fill="#fff" fontFamily="var(--font-gowun), serif">
          12
        </text>
      </g>
    </svg>
  );
}

/** 도장 가장자리를 살짝 번지게 하는 SVG 필터(한 번만 렌더) */
export function InkFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
      <filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

const STAMP_WORD = ["의결", "의결", "통과", "가결", "이송", "공포", "시행"];
const TILTS = [-7, 5, -4, 8, -6, 4, -3];

/** 결재 도장(완료된 단계) */
export function Stamp({ n, delay = 0, className = "" }: { n: number; delay?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`stamp text-seal mix-blend-multiply ${className}`}
      style={{ ["--tilt" as string]: `${TILTS[n - 1]}deg`, ["--delay" as string]: `${delay}ms` }}
    >
      <g filter="url(#ink)" fill="none" stroke="currentColor">
        <circle cx="50" cy="50" r="45" strokeWidth="6" />
        <circle cx="50" cy="50" r="36" strokeWidth="2" />
        <text x="50" y="61" textAnchor="middle" fontSize="30" fontWeight="700" fill="currentColor" stroke="none" fontFamily="var(--font-gowun), serif">
          {STAMP_WORD[n - 1]}
        </text>
      </g>
    </svg>
  );
}

/* ───────── 결재란 단계 표시 ①~⑦ ───────── */

const CIRCLED = "①②③④⑤⑥⑦";

export function defaultStages(): StageInfo[] {
  return STAGES.map((s) => ({ n: s.n, label: s.label, status: s.n === 1 ? "done" : s.n === 2 ? "in_progress" : "pending", date: s.n === 1 ? "2026-11-17" : null }));
}

export function StageTracker({ stages }: { stages: StageInfo[] | null }) {
  const st = stages || defaultStages();
  let doneIdx = 0;
  return (
    <ol className="grid grid-cols-7 overflow-hidden rounded-md border border-grid/50 bg-sheet" aria-label="입법 진행 단계, 7단계 중">
      {st.map((s, i) => {
        const meta = STAGES[s.n - 1];
        const done = s.status === "done";
        const next = s.status === "in_progress";
        const delay = done ? 150 + doneIdx++ * 140 : 0;
        const stateText = done ? `완료${s.date ? ` ${s.date}` : ""}` : next ? "다음 관문, 대기 중" : s.status === "unknown" ? "확인 필요" : "대기";
        return (
          <li key={s.n} className={`flex min-w-0 flex-col ${i > 0 ? "border-l border-grid/30" : ""}`}>
            <div className={`border-b border-grid/30 px-0.5 py-1.5 text-center leading-tight sm:py-2 ${done ? "bg-grid-soft" : ""}`}>
              <span className="block text-[11px] font-semibold text-grid sm:inline sm:text-xs" aria-hidden="true">
                {CIRCLED[s.n - 1]}
              </span>{" "}
              <span className={`block text-[12px] font-semibold sm:inline sm:text-sm ${done || next ? "text-ink" : "text-ink-3"}`}>{meta.short}</span>
              <span className="sr-only">
                {meta.label}: {stateText}
              </span>
            </div>
            <div className="relative flex h-[76px] flex-col items-center justify-center gap-1 sm:h-[124px]" aria-hidden="true">
              {done ? (
                <>
                  <Stamp n={s.n} delay={delay} className="h-11 w-11 sm:h-[76px] sm:w-[76px]" />
                  {s.date && <span className="tnum text-[11px] font-semibold text-seal-ink sm:text-[13px]">{splitYmd(s.date).md}</span>}
                </>
              ) : next ? (
                <>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-ink-3/60 text-[11px] font-semibold text-ink-2 sm:h-[76px] sm:w-[76px] sm:text-sm">다음</span>
                  <span className="text-[11px] text-ink-3 sm:text-[13px]">대기</span>
                </>
              ) : s.status === "unknown" ? (
                <span className="text-lg text-ink-3">?</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ───────── 히어로: 학년 띠(초1~초6) ───────── */

export function GradeStrip() {
  return (
    <figure className="w-full">
      <figcaption className="mb-2 flex items-baseline justify-between text-[13px] text-ink-2">
        <span className="font-semibold text-grid">초등학교 학년</span>
        <span>취학 중인 자녀 기준</span>
      </figcaption>
      <div className="grid grid-cols-6 border-l border-t border-ink" role="img" aria-label="현행은 초등학교 1~2학년까지, 개정안은 1~6학년까지 육아휴직 대상. 3학년부터 6학년까지 4개 학년이 새로 포함됩니다.">
        {[1, 2, 3, 4, 5, 6].map((g) => (
          <div key={g} className={`flex aspect-[1/1.08] flex-col items-center justify-center border-b border-r border-ink ${g <= 2 ? "bg-ink text-white" : "bg-marker text-ink"}`}>
            <span className="font-serif text-[30px] font-bold leading-none sm:text-[44px]">{g}</span>
            <span className={`mt-1 text-[11px] sm:text-xs ${g <= 2 ? "text-white/80" : "text-ink-2"}`}>학년</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-y-3 text-[13px] leading-tight" aria-hidden="true">
        <div className="col-span-2">
          <div className="h-2 border-x-[1.5px] border-b-[1.5px] border-ink" />
          <p className="mt-1.5 text-ink-2">
            <b className="font-semibold text-ink">현행</b> 만 8세 이하
          </p>
        </div>
        <div className="col-span-6">
          <div className="h-2 border-x-[1.5px] border-b-[1.5px] border-ink" />
          <p className="mt-1.5 text-ink-2">
            <b className="font-semibold text-ink">개정안(대안)</b> 만 12세 이하 · <span className="marker text-ink">3~6학년 새로 포함</span>
          </p>
        </div>
      </div>
    </figure>
  );
}

/* ───────── 작은 부품 ───────── */

const VTONE: Record<string, { dot: string; text: string; bg: string }> = {
  changed: { dot: "bg-seal", text: "text-seal-ink", bg: "bg-seal-soft" },
  uncertain: { dot: "bg-amber-ink", text: "text-amber-ink", bg: "bg-amber-soft" },
  none: { dot: "bg-grid", text: "text-grid", bg: "bg-grid-soft" },
  empty: { dot: "bg-ink-3", text: "text-ink-2", bg: "bg-rule-2" },
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict | null; size?: "sm" | "md" }) {
  const label = verdict ? VERDICTS[verdict].label : "아직 확인 기록 없음";
  const t = VTONE[verdict ?? "empty"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${t.bg} ${t.text} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

type Tone = "seal" | "amber" | "green" | "slate" | "ink";
const TAG: Record<Tone, string> = {
  seal: "border-seal/40 text-seal-ink",
  amber: "border-amber-ink/40 text-amber-ink bg-amber-soft",
  green: "border-grid/40 text-grid",
  slate: "border-rule text-ink-2",
  ink: "border-ink bg-ink text-white",
};
export function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-px text-xs font-semibold leading-5 ${TAG[tone]}`}>{children}</span>;
}

export function ExtLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`text-ink underline decoration-grid/50 decoration-1 underline-offset-[3px] transition-colors duration-150 hover:decoration-ink ${className}`}>
      {children}
      <span aria-hidden="true" className="ml-0.5 text-[0.8em] text-ink-3">
        ↗
      </span>
      <span className="sr-only"> (새 창)</span>
    </a>
  );
}

export function SectionHead({ id, eyebrow, title, right }: { id?: string; eyebrow?: string; title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div>
        {eyebrow && <p className="mb-1 text-[13px] font-semibold text-grid">{eyebrow}</p>}
        <h2 id={id} className="scroll-mt-4 font-serif text-[23px] font-bold leading-snug tracking-tight sm:text-[28px]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

/** 사실이 아닌 '추정'을 담는 상자: 점선 테두리 + 라벨 */
export function EstimateBox({ children, title = "향후 전망" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative rounded-md border border-dashed border-ink-3/60 bg-sheet/60 p-4 pt-5 sm:p-5">
      <p className="absolute -top-3 left-4 bg-paper px-1.5 text-[13px] font-semibold text-ink-2">
        {title} <span className="ml-1 rounded border border-ink-3/50 px-1 text-xs text-ink-3">추정</span>
      </p>
      {children}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "warn" | "error"; children: React.ReactNode }) {
  const c = tone === "ok" ? "border-grid/40 bg-grid-soft text-grid" : tone === "warn" ? "border-amber-ink/30 bg-amber-soft text-amber-ink" : "border-seal/40 bg-seal-soft text-seal-ink";
  return <div className={`rounded-md border px-4 py-3 text-sm font-medium ${c}`}>{children}</div>;
}
