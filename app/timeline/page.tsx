import { Card, ExtLink, Pill, VerdictBadge } from "@/components/ui";
import { fmtKst } from "@/lib/config";
import { store } from "@/lib/storage";
import type { EventKind, MonitorEvent, MonitorRun } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "타임라인 · 교원 육아휴직 입법 모니터" };

const KIND: Record<EventKind, { label: string; tone: "slate" | "red" | "amber" | "green" }> = {
  baseline: { label: "기준선", tone: "slate" },
  stage: { label: "단계", tone: "red" },
  alternative: { label: "대안", tone: "red" },
  meeting: { label: "회의", tone: "amber" },
  news: { label: "소식", tone: "green" },
  uncertain: { label: "확인 필요", tone: "amber" },
  content: { label: "조문", tone: "red" },
  lag: { label: "지연", tone: "slate" },
};

const HISTORY = [
  { date: "2026-01-21", text: "위성곤의원 대표발의 교육공무원법 개정안(2216190) 발의 — 육아휴직 대상 만 12세·초6 확대(안 제44조)" },
  { date: "2026-02-24", text: "교육위 전체회의 상정·법안소위 회부(2216190)" },
  { date: "2026-04-20", text: "법안소위 상정(2216190)" },
  { date: "2026-10-08", text: "김희정의원 대표발의 교육공무원법 개정안(2221830) 발의 — 12세 확대 + 난임휴직 '장기간' 삭제" },
  { date: "2026-11-16", text: "제439회 제7차 교육위 전체회의 상정·소위 회부(2221830)" },
  { date: "2026-11-17", text: "제439회 제1차 교육위 법안심사소위: 교육공무원법 4건·사립학교법 3건 대안반영폐기 의결 → ① 완료" },
];

export default async function Timeline() {
  const db = store();
  const [events, runs] = await Promise.all([db.list<MonitorEvent>("events", { limit: 200 }), db.list<MonitorRun>("runs", { limit: 30 })]);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-civic-900">타임라인</h1>
      <Card title="자동 감지 이벤트">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">아직 감지된 이벤트가 없습니다.</p>
        ) : (
          <ol className="relative ml-2 border-l border-slate-200">
            {events.map((e) => (
              <li key={e.id} className="mb-4 ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-civic-600" />
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={KIND[e.kind]?.tone}>{KIND[e.kind]?.label ?? e.kind}</Pill>
                  <span className="text-xs text-slate-500">감지 {fmtKst(e.createdAt)}{e.date ? ` · 발생 ${e.date}` : ""}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-800">{e.title}</p>
                {e.detail && <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">{e.detail}</p>}
                {e.sources && e.sources.length > 0 && (
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                    {e.sources.map((s) => (
                      <ExtLink key={s.url} href={s.url}>
                        {s.label}
                      </ExtLink>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card title="기준선 이전 경과" right={<span className="text-xs text-slate-500">사용자 제공 회의결과·입법현황 기준</span>}>
        <ul className="space-y-1.5 text-sm">
          {HISTORY.map((h) => (
            <li key={h.date + h.text} className="flex gap-3">
              <span className="w-20 shrink-0 text-xs font-semibold tabular-nums text-slate-500">{h.date}</span>
              <span className="text-slate-700">{h.text}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="최근 확인 기록">
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">실행 기록이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {runs.map((r) => (
              <li key={r.id} className="py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <VerdictBadge verdict={r.verdict} size="sm" />
                  <span className="text-xs text-slate-500">{fmtKst(r.createdAt)} · {r.trigger === "cron" ? "정기" : r.trigger === "admin" ? "수동" : "CLI"}</span>
                </div>
                <p className="mt-1 text-xs text-slate-700">{r.headline}</p>
                <details className="mt-1 text-xs text-slate-500">
                  <summary className="cursor-pointer">조회 소스 {r.sources.filter((s) => s.ok).length}/{r.sources.length} 성공</summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {r.sources.map((s) => (
                      <li key={s.name}>
                        {s.ok ? "✓" : "✗"} {s.name}: {s.detail}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
