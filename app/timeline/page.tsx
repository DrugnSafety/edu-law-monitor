import { ExtLink, Tag, VerdictBadge } from "@/components/ui";
import { CHECK_TIMES_KST, kstDate } from "@/lib/config";
import { fmtDateTime, splitYmd } from "@/lib/format";
import { store } from "@/lib/storage";
import type { EventKind, MonitorEvent, MonitorRun } from "@/lib/types";

export const revalidate = 1800;
export const metadata = { title: "타임라인 · 교원 육아휴직 12세 입법 모니터" };

const KIND: Record<EventKind, { label: string; tone: "seal" | "amber" | "green" | "slate" | "ink" }> = {
  baseline: { label: "기준선", tone: "slate" },
  stage: { label: "단계", tone: "seal" },
  alternative: { label: "대안", tone: "seal" },
  meeting: { label: "회의", tone: "ink" },
  news: { label: "소식", tone: "green" },
  uncertain: { label: "확인 필요", tone: "amber" },
  content: { label: "조문", tone: "seal" },
  lag: { label: "지연", tone: "slate" },
  call: { label: "피클 통화", tone: "seal" },
};

const HISTORY = [
  { date: "2026-01-21", text: "위성곤의원 대표발의 교육공무원법 개정안(2216190) 발의 — 육아휴직 대상 만 12세·초6 확대(안 제44조)" },
  { date: "2026-02-24", text: "교육위 전체회의 상정·법안소위 회부(2216190)" },
  { date: "2026-04-20", text: "법안소위 상정(2216190)" },
  { date: "2026-10-08", text: "김희정의원 대표발의 교육공무원법 개정안(2221830) 발의 — 12세 확대 + 난임휴직 ‘장기간’ 삭제" },
  { date: "2026-11-16", text: "제439회 제7차 교육위 전체회의 상정·소위 회부(2221830)" },
  { date: "2026-11-17", text: "제439회 제1차 교육위 법안심사소위: 교육공무원법 4건·사립학교법 3건 대안반영폐기 의결 → ① 완료" },
];

const SCHEDULE = [
  { t: CHECK_TIMES_KST[0], d: "밤사이 반영된 의안 정보와 오늘 공지된 의사일정. 회의는 보통 10:00·14:00에 시작합니다." },
  { t: CHECK_TIMES_KST[1], d: "오전 회의 결과와 오후 일정." },
  { t: CHECK_TIMES_KST[2], d: "그날의 처리 결과와 다음 날 일정." },
];

export default async function Timeline() {
  const db = store();
  const [events, runs] = await Promise.all([db.list<MonitorEvent>("events", { limit: 200 }).catch(() => []), db.list<MonitorRun>("runs", { limit: 30 }).catch(() => [])]);
  return (
    <div className="pt-10 sm:pt-14">
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
        <div>
          <p className="text-[13px] font-semibold text-grid">자동 감지 기록</p>
          <h1 className="mt-2 font-serif text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">타임라인</h1>
          <p className="mt-3 max-w-[36em] text-[16px] leading-relaxed text-ink-2">
            국회 공식 데이터에서 감지한 변화, 관련 소식, 피클의 통화 결과를 시간 순서로 남깁니다. 날짜는 사건이 일어난 날이고, 감지 시각은 이 사이트가 처음 확인한 시각입니다.
          </p>
        </div>
        <aside aria-labelledby="sched-h" className="self-start rounded-md border border-rule bg-sheet p-4">
          <h2 id="sched-h" className="text-[15px] font-semibold text-ink">
            하루 3회 확인: <span className="tnum">{CHECK_TIMES_KST.join(" · ")}</span>
          </h2>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-2">
            {SCHEDULE.map((s) => (
              <li key={s.t} className="grid grid-cols-[44px_1fr] gap-2">
                <span className="tnum font-semibold text-ink">{s.t}</span>
                <span>{s.d}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">국회 API에는 갱신 시각 정보가 없어, 회의 시작 시각을 기준으로 정했습니다.</p>
        </aside>
      </header>

      <section aria-labelledby="ev-h" className="mt-12">
        <h2 id="ev-h" className="sr-only">
          감지된 사건
        </h2>
        {events.length === 0 ? (
          <p className="rounded-md border border-dashed border-ink-3/50 px-4 py-6 text-ink-2">아직 감지된 사건이 없습니다. 다음 확인 때 변화가 있으면 여기에 기록합니다.</p>
        ) : (
          <ol className="border-t border-ink">
            {events.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="hist-h" className="mt-14">
        <h2 id="hist-h" className="font-serif text-[22px] font-bold">
          기준선 이전 경과
        </h2>
        <p className="mt-1 text-[13px] text-ink-3">회의결과·국민참여입법센터 입법현황 기준. 자동 감지 이전의 기록입니다.</p>
        <ol className="mt-4 border-t border-rule">
          {[...HISTORY].reverse().map((h) => {
            const d = splitYmd(h.date);
            return (
              <li key={h.date + h.text} className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-rule py-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                <time dateTime={h.date} className="tnum text-[13px] font-semibold text-ink-2">
                  {h.date.slice(0, 4)}
                  <br className="sm:hidden" /> {d.md}
                </time>
                <p className="text-[15px] text-ink">{h.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="runs-h" className="mt-14">
        <h2 id="runs-h" className="font-serif text-[22px] font-bold">
          최근 확인 기록
        </h2>
        {runs.length === 0 ? (
          <p className="mt-3 text-ink-2">확인 기록이 없습니다.</p>
        ) : (
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {runs.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                  <VerdictBadge verdict={r.verdict} size="sm" />
                  <time className="tnum" dateTime={r.createdAt}>
                    {fmtDateTime(r.createdAt)}
                  </time>
                  <span>· {r.trigger === "cron" ? "정기 확인" : r.trigger === "admin" ? "수동 확인" : "명령줄 확인"}</span>
                </div>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{r.headline}</p>
                <details className="mt-1 text-[13px] text-ink-3">
                  <summary className="cursor-pointer select-none hover:text-ink">
                    조회한 출처 {r.sources.filter((s) => s.ok).length}/{r.sources.length} 성공
                  </summary>
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {r.sources.map((s) => (
                      <li key={s.name}>
                        <span aria-hidden="true">{s.ok ? "✓" : "✗"}</span>
                        <span className="sr-only">{s.ok ? "성공" : "실패"}</span> {s.name}: {s.detail}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EventRow({ e }: { e: MonitorEvent }) {
  const k = KIND[e.kind] ?? { label: e.kind, tone: "slate" as const };
  const day = e.date || kstDate(new Date(e.createdAt));
  const d = splitYmd(day.slice(0, 10));
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-rule py-4 sm:grid-cols-[96px_minmax(0,1fr)]">
      <div>
        <time dateTime={day} className="tnum block font-serif text-xl font-bold leading-none text-ink">
          {d.md}
        </time>
        <span className="mt-1 block text-xs text-ink-3">{d.wd}요일</span>
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={k.tone}>{k.label}</Tag>
          <span className="text-xs text-ink-3">
            감지 <time dateTime={e.createdAt} className="tnum">{fmtDateTime(e.createdAt)}</time>
          </span>
        </div>
        <p className="mt-1.5 text-[16px] font-semibold leading-snug text-ink">{e.title}</p>
        {e.detail && <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink-2">{e.detail}</p>}
        {e.sources && e.sources.length > 0 && (
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {e.sources.map((s) => (
              <ExtLink key={s.url} href={s.url}>
                {s.label}
              </ExtLink>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}
