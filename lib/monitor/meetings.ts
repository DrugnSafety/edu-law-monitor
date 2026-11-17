import { assemblyQuery, s, SERVICES, stripHtml } from "../assembly";
import { addDays, ASSEMBLY_UNIT_CD } from "../config";
import type { Meeting, SourceStatus } from "../types";

import { BASELINE_BILLS } from "../config";

// strong: 기준선 원안·대안 의안번호, 대상 법률의 (대안), 육아휴직 언급
// weak: 다른 교육공무원법/사립학교법 개정안(정보 표시만)
// generic: "소위원회 심사보고" 등 개별 법안이 드러나지 않는 안건(포함 여부 불명확)
function matchAgenda(text: string, altBillNos: string[]) {
  const lines = stripHtml(text)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const nos = [...BASELINE_BILLS.map((b) => b.billNo), ...altBillNos];
  const strong = lines.filter((l) => nos.some((n) => l.includes(n)) || /(교육공무원법|사립학교법)[^\n]*\(대안\)/.test(l) || /육아휴직/.test(l));
  const weak = lines.filter((l) => !strong.includes(l) && /교육공무원법|사립학교법/.test(l));
  const generic = lines.filter((l) => /소위원회\s*(심사)?\s*(결과\s*)?보고|법안심사소위원회\s*(심사)?보고|위원회\s*대안/.test(l));
  return { strong, weak, generic };
}

type Spec = {
  service: string;
  params: Record<string, string>;
  body: Meeting["body"];
  label: string;
  filter?: (r: Record<string, unknown>) => boolean;
  map: (r: Record<string, unknown>) => { date: string | null; time: string | null; title: string; session: string | null; link: string | null; agenda: string };
};

const SPECS: Spec[] = [
  {
    service: SERVICES.committeeSchedule,
    params: { UNIT_CD: ASSEMBLY_UNIT_CD, COMMITTEE_NAME: "교육위원회" },
    body: "교육위 전체회의",
    label: "위원회 전체회의 일정 — 교육위",
    map: (r) => ({ date: s(r.MEETING_DATE), time: s(r.MEETING_TIME), title: `${s(r.SESS) ?? ""} 제${s(r.DEGREE) ?? "?"}차 ${s(r.TITLE) ?? ""}`.trim(), session: s(r.SESS), link: s(r.LINK_URL2), agenda: s(r.ANGUN) || "" }),
  },
  {
    service: SERVICES.subcommitteeSchedule,
    params: { UNIT_CD: ASSEMBLY_UNIT_CD, COMMITTEE_NAME: "교육위원회" },
    body: "교육위 소위",
    label: "소위원회 일정 — 교육위",
    filter: (r) => !/^전체회의$/.test(String(r.TITLE ?? "").trim()), // 이 서비스는 전체회의도 함께 반환
    map: (r) => ({ date: s(r.MEETING_DATE), time: s(r.MEETING_TIME), title: `${s(r.SESS) ?? ""} 제${s(r.DEGREE) ?? "?"}차 ${s(r.TITLE) ?? ""}`.trim(), session: s(r.SESS), link: s(r.LINK_URL2), agenda: s(r.ANGUN) || "" }),
  },
  {
    service: SERVICES.committeeSchedule,
    params: { UNIT_CD: ASSEMBLY_UNIT_CD, COMMITTEE_NAME: "법제사법위원회" },
    body: "법사위 전체회의",
    label: "위원회 전체회의 일정 — 법사위",
    map: (r) => ({ date: s(r.MEETING_DATE), time: s(r.MEETING_TIME), title: `${s(r.SESS) ?? ""} 제${s(r.DEGREE) ?? "?"}차 ${s(r.TITLE) ?? ""}`.trim(), session: s(r.SESS), link: s(r.LINK_URL2), agenda: s(r.ANGUN) || "" }),
  },
  {
    service: SERVICES.plenarySchedule,
    params: { UNIT_CD: ASSEMBLY_UNIT_CD },
    body: "본회의",
    label: "본회의 일정",
    map: (r) => ({ date: s(r.MEETTING_DATE), time: s(r.MEETTING_TIME), title: `${s(r.MEETINGSESSION) ?? ""} ${s(r.CHA) ?? ""} 본회의`.replace(/\s+/g, " ").trim(), session: s(r.MEETINGSESSION), link: s(r.LINK_URL), agenda: s(r.CONTS) || "" }),
  },
];

export async function fetchMeetings(
  today: string,
  altBillNos: string[],
  sources: SourceStatus[],
  window = { back: 3, forward: 7 },
): Promise<Meeting[]> {
  const from = addDays(today, -window.back);
  const to = addDays(today, window.forward);
  const out: Meeting[] = [];
  for (const sp of SPECS) {
    try {
      const { rows } = await assemblyQuery(sp.service, sp.params, { pSize: 100 });
      let n = 0;
      for (const r of rows) {
        const m = sp.map(r);
        if (sp.filter && !sp.filter(r)) continue;
        if (!m.date || m.date < from || m.date > to) continue;
        n++;
        const agendaAvailable = stripHtml(m.agenda).length > 0;
        const mt = agendaAvailable ? matchAgenda(m.agenda, altBillNos) : { strong: [], weak: [], generic: [] };
        out.push({
          key: `${sp.body}|${m.date}|${m.title}`,
          date: m.date,
          time: m.time,
          body: sp.body,
          title: m.title,
          session: m.session,
          link: m.link,
          agendaAvailable,
          relevant: !agendaAvailable ? null : mt.strong.length > 0 ? true : mt.generic.length > 0 ? null : false,
          matchedItems: mt.strong.slice(0, 12),
          otherItems: [...mt.weak, ...mt.generic].slice(0, 8),
          when: m.date < today ? "past" : m.date === today ? "today" : "upcoming",
        });
      }
      sources.push({ name: `${sp.label}(${sp.service})`, ok: true, detail: `${rows.length}건 수신, 기간(${from}~${to}) 내 ${n}건`, rows: rows.length });
    } catch (e) {
      sources.push({ name: `${sp.label}(${sp.service})`, ok: false, detail: (e as Error).message });
    }
  }
  return out.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
}
