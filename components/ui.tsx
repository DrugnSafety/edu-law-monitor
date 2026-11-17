import { STAGES, VERDICTS, type Verdict } from "@/lib/config";
import type { StageInfo } from "@/lib/types";

export function Card({ title, right, children, className = "" }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          {title && <h2 className="text-base font-bold text-civic-900">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const TONE: Record<string, string> = {
  red: "bg-rose-50 text-rose-800 ring-rose-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};
const DOT: Record<string, string> = { red: "bg-rose-500", amber: "bg-amber-500", green: "bg-emerald-500", slate: "bg-slate-400" };

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict | null; size?: "sm" | "md" }) {
  const v = verdict ? VERDICTS[verdict] : { label: "아직 실행 기록 없음", tone: "slate" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${TONE[v.tone]} ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}`}>
      <span className={`h-2 w-2 rounded-full ${DOT[v.tone]}`} />
      {v.label}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "red" | "amber" | "green" }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${TONE[tone]}`}>{children}</span>;
}

export function StageBar({ stages }: { stages: StageInfo[] | null }) {
  const st: StageInfo[] =
    stages ||
    STAGES.map((s) => ({ n: s.n, label: s.label, status: s.n === 1 ? "done" : s.n === 2 ? "in_progress" : "pending", date: s.n === 1 ? "2026-11-17" : null }));
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="입법 진행 단계">
      {st.map((s) => {
        const meta = STAGES[s.n - 1];
        const done = s.status === "done";
        const cur = s.status === "in_progress";
        return (
          <li key={s.n} className="flex flex-col items-center text-center" title={s.evidence || s.label}>
            <div className={`h-2 w-full rounded-full ${done ? "bg-civic-600" : cur ? "bg-amber-400" : "bg-slate-200"}`} />
            <span className={`mt-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-civic-600 text-white" : cur ? "bg-amber-100 text-amber-900 ring-2 ring-amber-400" : "bg-slate-100 text-slate-400"}`}>
              {s.n}
            </span>
            <span className={`mt-1 text-[11px] font-semibold leading-tight sm:text-xs ${done ? "text-civic-800" : cur ? "text-amber-900" : "text-slate-400"}`}>{meta.short}</span>
            <span className="text-[10px] leading-tight text-slate-500">{done ? s.date?.slice(5).replace("-", ".") : cur ? "대기" : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-civic-600 underline decoration-civic-100 underline-offset-2 hover:decoration-civic-600">
      {children}
    </a>
  );
}
