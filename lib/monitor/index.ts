import {
  BASELINE_DATE,
  daysBetween,
  kstDate,
  MANUAL_CHECK_LINKS,
  SESSION_END,
  STAGES,
  type Verdict,
} from "../config";
import { llm } from "../llm";
import { searchNaver } from "../naver";
import { newId, store } from "../storage";
import { sendUpdateDigest } from "../mail";
import type { Rec } from "../storage";
import { formatVerdictNotice, sendTelegram, telegramConfigured } from "../telegram";
import type { AlternativeInfo, BillSnapshot, Meeting, MonitorEvent, MonitorRun, NewsItem, SourceStatus, StageInfo } from "../types";
import { fetchBaselineBills, findAlternatives } from "./bills";
import { fetchMeetings } from "./meetings";

const BODY_STAGE: Record<Meeting["body"], number> = { "교육위 소위": 2, "교육위 전체회의": 2, "법사위 전체회의": 3, 본회의: 4 };

function computeStages(baseline: BillSnapshot[], alts: AlternativeInfo[]): StageInfo[] {
  const alt = alts.find((a) => a.law === "교육공무원법") || alts[0];
  const st: StageInfo[] = STAGES.map((s) => ({ n: s.n, label: s.label, status: "pending" as const }));
  st[0] = { ...st[0], status: "done", date: BASELINE_DATE, evidence: "제439회 제1차 교육위 법안심사소위 대안반영폐기 의결(회의결과보고서, 기준선)" };
  const discarded = baseline.filter((b) => b.law !== "사립학교법" && (b.committeeResult || "").includes("대안반영폐기") && b.committeeProcDate);
  if (alt) {
    st[1] = { ...st[1], status: "done", date: alt.committeeProcDate || alt.proposeDate || null, evidence: `위원장 대안 ${alt.billNo} 확인(의안정보 API)` };
  } else if (discarded.length) {
    const d = discarded.map((b) => b.committeeProcDate!).sort().pop()!;
    st[1] = { ...st[1], status: "done", date: d, evidence: `원안 ${discarded.map((b) => b.billNo).join(", ")} 소관위 처리결과 '대안반영폐기'(${d}) — 대안 의안번호는 아직 API 미등록` };
  } else {
    st[1] = { ...st[1], status: "in_progress", evidence: "대안 의안번호 미확인(API 미등록)" };
  }
  if (alt) {
    if (alt.judiciaryProcDate) st[2] = { ...st[2], status: "done", date: alt.judiciaryProcDate, evidence: `법사위 ${alt.judiciaryResult ?? "처리"}` };
    else if (alt.judiciaryReferDate) st[2] = { ...st[2], status: "in_progress", date: alt.judiciaryReferDate, evidence: "법사위 회부" };
    if (alt.plenaryDate) st[3] = { ...st[3], status: "done", date: alt.plenaryDate, evidence: `본회의 ${alt.plenaryResult ?? "의결"}` };
    if (alt.transferDate) st[4] = { ...st[4], status: "done", date: alt.transferDate, evidence: "정부 이송" };
    if (alt.promulgationDate) {
      st[5] = { ...st[5], status: "done", date: alt.promulgationDate, evidence: `공포(법률 제${alt.promulgationNo ?? "?"}호)` };
      st[6] = { ...st[6], status: "unknown", evidence: "시행일은 부칙 확인 필요" };
    }
  }
  return st;
}

function topStage(st: StageInfo[]): number {
  let n = 0;
  for (const s of st) if (s.status === "done") n = s.n;
  return n;
}

function ruleOutlook(today: string, stage: number, meetings: Meeting[], alts: AlternativeInfo[]): string {
  const dday = daysBetween(today, SESSION_END);
  const wantBody: Meeting["body"] = stage <= 1 ? "교육위 전체회의" : stage === 2 ? "법사위 전체회의" : "본회의";
  const next = meetings.find((m) => m.when !== "past" && m.body === wantBody);
  const nextTxt = next ? `다음 ${next.body}는 ${next.date}로 공지되어 있습니다${next.relevant ? "(안건 포함)" : next.relevant === false ? "(현재 공지 안건에는 미포함)" : "(안건 미공지)"}.` : `향후 7일 내 ${wantBody} 일정은 아직 국회 API에 등록되지 않았습니다.`;
  const dTxt = dday >= 0 ? `정기회 종료(12/9)까지 D-${dday}.` : "정기회는 종료되었습니다.";
  if (stage <= 1)
    return `[추정] 소위가 의결한 대안은 교육위 전체회의에서 의결되어야 교육위원장 명의의 새 의안번호를 받습니다. ${nextTxt} 통상 소위 의결안은 다음 전체회의에서 일괄 의결되고, 이후 법사위 체계·자구심사(회부 후 5일 숙려 원칙)와 본회의를 거칩니다. ${dTxt} 정기회 내 본회의 상정 여부가 관건입니다.`;
  if (stage === 2)
    return `[추정] 교육위 의결 이후 법사위 체계·자구심사가 다음 관문입니다(대안 ${alts[0]?.billNo ?? "번호 미확인"}). ${nextTxt} 법사위는 회부 후 5일 숙려기간이 원칙이라 이견이 없으면 1~3주 내 처리되는 경우가 많습니다. ${dTxt}`;
  if (stage === 3) return `[추정] 법사위를 통과했으므로 다음 본회의에서 상정·의결될 가능성이 큽니다. ${nextTxt} ${dTxt}`;
  if (stage === 4) return "[추정] 본회의 의결 후 통상 수일~2주 내 정부로 이송되고, 이송 후 15일 이내 공포됩니다.";
  if (stage === 5) return "[추정] 정부 이송 후 15일 이내 공포가 원칙입니다. 공포 후 시행일은 부칙에 따릅니다.";
  return "[추정] 공포가 확인되었습니다. 시행일(부칙)을 확인하세요. 시행 이후에는 모니터링을 종료해도 됩니다.";
}

async function summarizeNews(items: Omit<NewsItem, "createdAt" | "summary">[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const it of items) map.set(it.id, it.description.length > 140 ? it.description.slice(0, 137) + "…" : it.description);
  if (!items.length) return map;
  const out = await llm(
    "너는 한국 입법 뉴스 요약가다. 각 항목을 사실만으로 2문장 이내 한국어로 요약한다. 확인되지 않은 내용은 추가하지 않는다. 출력은 JSON 객체 {id: summary}만.",
    JSON.stringify(items.slice(0, 30).map((i) => ({ id: i.id, title: i.title, description: i.description }))),
    2000,
  );
  if (out) {
    try {
      const j = JSON.parse(out.replace(/^```(json)?|```$/g, "").trim()) as Record<string, string>;
      for (const [k, v] of Object.entries(j)) if (map.has(k) && typeof v === "string") map.set(k, v);
    } catch {
      /* 규칙 기반 요약 유지 */
    }
  }
  return map;
}

export type RunResult = { run: MonitorRun; events: MonitorEvent[]; emailed: number; telegram: "sent" | "failed" | "dry-run" | "skipped" };

export async function runMonitor(trigger: MonitorRun["trigger"]): Promise<RunResult> {
  const t0 = Date.now();
  const db = store();
  const today = kstDate();
  const runId = newId("run_");
  const createdAt = new Date().toISOString();
  const sources: SourceStatus[] = [];
  const reasons: string[] = [];
  const uncertainties: string[] = [];
  const notes: string[] = [];
  const events: MonitorEvent[] = [];
  const ev = (e: Omit<MonitorEvent, "id" | "createdAt" | "runId">) => events.push({ id: newId("ev_"), createdAt, runId, ...e });

  const prev = (await db.list<MonitorRun>("runs", { limit: 1 }))[0] || null;
  let resumed = 0;
  try {
    resumed = await resumePendingDigest(t0);
  } catch (e) {
    console.warn("[monitor] 지난 알림 메일 이어 보내기 실패", (e as Error).message);
  }

  // 1) 의안
  const baselineBills = await fetchBaselineBills(sources);
  const alternatives = await findAlternatives(sources);

  // 2) 회의
  const meetings = await fetchMeetings(today, alternatives.map((a) => a.billNo), sources);

  // 3) 단계
  const stages = computeStages(baselineBills, alternatives);
  const stage = topStage(stages);
  const prevStages = prev?.stages || computeStages([], []);

  // ---- 변화 판정 (B) 입법 단계
  for (const s of stages) {
    const p = prevStages.find((x) => x.n === s.n);
    if (s.status !== p?.status || (s.date || null) !== (p?.date || null)) {
      if (s.status === "done" || s.status === "in_progress") {
        ev({ kind: "stage", title: `${"①②③④⑤⑥⑦"[s.n - 1]} ${s.label} — ${s.status === "done" ? "확인" : "진행 중"}${s.date ? ` (${s.date})` : ""}`, detail: s.evidence, date: s.date || null });
      }
    }
  }
  const prevAltNos = new Set((prev?.alternatives || []).map((a) => a.billNo));
  for (const a of alternatives) {
    if (!prevAltNos.has(a.billNo)) {
      ev({
        kind: "alternative",
        title: `${a.law} 위원장 대안 의안번호 확인: ${a.billNo}`,
        detail: `${a.name} / 제안 ${a.proposeDate ?? "?"} / 조문 확인: 12세 ${fmtBool(a.contentCheck?.age12)}, 초6 ${fmtBool(a.contentCheck?.grade6)}, '장기간' 언급 ${fmtBool(a.contentCheck?.removesLongTerm)}`,
        sources: a.link ? [{ label: "의안정보시스템", url: a.link }] : [],
        date: a.proposeDate,
      });
    }
  }
  if (alternatives.length) reasons.push(`위원장 대안 확인: ${alternatives.map((a) => `${a.law} ${a.billNo}`).join(", ")}`);
  const newStageEvents = events.filter((e) => e.kind === "stage" && !e.title.startsWith("①"));
  if (newStageEvents.length) reasons.push(...newStageEvents.map((e) => e.title));

  // 원안 처리결과 지연(최신성 의심) — 그 자체는 변화/불확실 아님
  const lagging = baselineBills.filter((b) => b.found && !(b.committeeResult || "").includes("대안반영폐기"));
  if (lagging.length) notes.push(`API 최신성 지연: 기준선 원안 ${lagging.length}건의 처리결과에 11/17 '대안반영폐기'가 아직 반영되지 않음(갱신 지연 추정, 변화 아님)`);

  // ---- (A) 회의
  const prevMeetingKeys = new Set((prev?.meetings || []).filter((m) => m.relevant).map((m) => m.key));
  // 기준일(11/17) 이전·당일 회의는 기준선에 이미 반영된 이력(11/16 전체회의 상정·소위회부, 11/17 소위 대안반영폐기)
  for (const m of meetings) {
    if (m.date <= BASELINE_DATE) {
      if (m.relevant) notes.push(`기준선 교차확인: ${m.date} ${m.body} 안건에 대상 원안 ${m.matchedItems.length}건 포함(API 확인, 기준선 반영 사항)`);
      continue;
    }
    const stageDone = stages[BODY_STAGE[m.body] - 1]?.status === "done";
    if (m.relevant) {
      if (m.when === "upcoming") reasons.push(`관련 회의 예정: ${m.date} ${m.body} — 안건 ${m.matchedItems.length}건 포함`);
      if (!prevMeetingKeys.has(m.key)) {
        ev({ kind: "meeting", title: `${m.date} ${m.body} 안건에 대상 법안 포함`, detail: m.matchedItems.join("\n"), sources: m.link ? [{ label: "회의 일정", url: m.link }] : [], date: m.date });
      }
      if ((m.when === "past" || m.when === "today") && !stageDone) {
        uncertainties.push(`${m.date} ${m.body} 안건에 대상 법안이 포함됐으나 처리 결과가 API에 아직 없음`);
      }
    } else if (m.relevant === null && m.when !== "upcoming") {
      uncertainties.push(m.agendaAvailable ? `${m.date} ${m.body} 안건에 '소위 심사보고' 등 개별 법안이 드러나지 않는 항목이 있어 대상 포함 여부 불명확` : `${m.date} ${m.body}가 열렸으나 안건 정보를 확인할 수 없음`);
    } else if (m.relevant === null && m.when === "upcoming") {
      notes.push(`${m.date} ${m.body} 예정 — 안건 미공지(공지 후 재확인)`);
    }
  }

  // 소스 실패 → 단일 소스 공백으로 "변화 없음" 선언 금지
  const core = sources.filter((s) => !s.name.startsWith("네이버"));
  for (const s of core) if (!s.ok) uncertainties.push(`${s.name} 조회 실패: ${s.detail}`);
  for (const s of core) if (s.ok && s.rows === 0 && !s.name.includes("대안")) uncertainties.push(`${s.name} 응답 0건(비정상 의심)`);

  // ---- (C) 뉴스
  const rawNews = await searchNaver(sources);
  const existing = new Set((await db.list<NewsItem>("news")).map((n) => n.id));
  const fresh = rawNews.filter((n) => !existing.has(n.id));
  const summaries = await summarizeNews(fresh);
  const since48h = Date.now() - 48 * 3600 * 1000;
  let recentNew = 0;
  for (const n of fresh) {
    const item: NewsItem = { ...n, createdAt, summary: summaries.get(n.id) || n.description };
    await db.upsert("news", item);
    const ts = n.pubDate ? new Date(n.pubDate.length === 10 ? n.pubDate + "T00:00:00+09:00" : n.pubDate).getTime() : NaN;
    if (n.strong && !isNaN(ts) && ts >= since48h && ts >= new Date(BASELINE_DATE + "T00:00:00+09:00").getTime()) {
      recentNew++;
      ev({ kind: "news", title: `[${n.kind === "news" ? "뉴스" : n.kind === "blog" ? "블로그" : "카페"}] ${n.title}`, detail: item.summary, sources: [{ label: n.source || "링크", url: n.link }], date: n.pubDate?.slice(0, 10) });
      // 기사-API 불일치 검사
      const txt = n.title + " " + n.description;
      const claims =
        /본회의\s*(통과|의결|가결)/.test(txt) ? 4 : /법사위\s*(통과|의결)/.test(txt) ? 3 : /교육위\S*\s*(통과|의결)|상임위\s*(통과|의결)/.test(txt) ? 2 : 0;
      if (claims > stage && /육아휴직/.test(txt)) uncertainties.push(`기사("${n.title.slice(0, 40)}")는 ${STAGES[claims - 1].label}을 시사하나 API에는 미반영 — 확인 필요`);
    }
  }
  if (recentNew) reasons.push(`최근 48시간 내 관련 새 글 ${recentNew}건`);
  if (!sources.find((s) => s.name.startsWith("네이버"))?.ok) notes.push("뉴스 교차확인 미설정 또는 실패 — 판정은 국회 API(의안·일정) 기준");

  // ---- 판정
  const uniqUnc = [...new Set(uncertainties)];
  const verdict: Verdict = reasons.length ? "changed" : uniqUnc.length ? "uncertain" : "none";
  const altTxt = alternatives.length ? `확인(${alternatives.map((a) => a.billNo).join(", ")})` : "미확인";
  let headline: string;
  if (verdict === "changed") headline = `[알림] ${reasons[0]}`;
  else if (verdict === "uncertain") headline = `[확인 필요] ${uniqUnc[0]}`;
  else
    headline = `변화 없음 — ${today} 기준 교육공무원법(대안) 신규 단계 없음 (대안 의안번호: ${altTxt} · 일정 확인: 교육위·법사위·본회의 최근 3일·향후 7일 관련 안건 없음 · 국회 API 조회 성공 · 뉴스 교차확인 ${sources.find((s) => s.name.startsWith("네이버"))?.ok ? "완료" : "미설정"})`;

  // ---- 전망
  const facts = { today, stage, stages, alternatives: alternatives.map(({ summary, ...a }) => ({ ...a, summary: summary?.slice(0, 600) })), meetings: meetings.filter((m) => m.when !== "past"), sessionEnd: SESSION_END, verdict, reasons, uncertainties: uniqUnc };
  const llmOutlook = await llm(
    "너는 한국 국회 입법절차 해설자다. 주어진 사실(JSON)만 근거로 교원 육아휴직 12세 확대 교육공무원법 대안의 향후 진행 전망을 한국어 3~4문장으로 쓴다. 반드시 첫머리에 '[추정]'을 붙이고, 확인된 사실과 일반 절차상 추정을 구분한다. 정기회 종료일(12/9), 법사위 5일 숙려기간 원칙 등 절차 상식을 반영한다. 새로운 사실을 지어내지 않는다.",
    JSON.stringify(facts),
    500,
  );
  const outlook = llmOutlook ? { text: llmOutlook.startsWith("[추정]") ? llmOutlook : `[추정] ${llmOutlook}`, generatedBy: "llm" as const } : { text: ruleOutlook(today, stage, meetings, alternatives), generatedBy: "rule" as const };

  if (!prev) {
    ev({ kind: "baseline", title: "모니터 시작 — 기준선 등록", detail: `2026-11-17 교육위 법안소위에서 교육공무원법 4건·사립학교법 3건 대안반영폐기 의결(①). 원안 API 조회 ${baselineBills.filter((b) => b.found).length}/${baselineBills.length}건.`, date: BASELINE_DATE });
  }
  // 불확실 항목은 출처 단위 키로 비교(오류 문구가 'timeout'↔'HTTP 503'으로만 바뀐 경우는 같은 항목)
  const uncKeys = uncertaintyKeys(uniqUnc);
  if (verdict === "uncertain" && (prev?.verdict !== "uncertain" || uncKeys !== uncertaintyKeys(prev?.uncertainties || []))) {
    ev({ kind: "uncertain", title: `확인 불확실: ${uniqUnc[0]}`, detail: uniqUnc.join("\n"), sources: MANUAL_CHECK_LINKS.map((l) => ({ label: l.label, url: l.url })) });
  }

  const run: MonitorRun = {
    id: runId,
    createdAt,
    kstDate: today,
    trigger,
    verdict,
    headline,
    reasons,
    uncertainties: uniqUnc,
    notes: [...new Set(notes)],
    stage,
    stages,
    baselineBills,
    alternatives,
    meetings,
    sources,
    outlook,
    newsNew: recentNew,
    durationMs: Date.now() - t0,
  };
  await db.insert("runs", run);
  for (const e of events) await db.insert("events", e);

  // ---- 알림: '변화 있음'·'확인 불확실'이면서 새 이벤트(기준선 제외)가 있을 때만.
  // 불확실 이벤트만 있고 같은 항목을 24시간 안에 이미 알렸다면 다시 알리지 않는다.
  let notifiable = events.filter((e) => e.kind !== "baseline" && e.kind !== "lag");
  const state = (await db.get<NoticeState>("meta", "notice_state")) || { id: "notice_state", createdAt };
  if (notifiable.length && notifiable.every((e) => e.kind === "uncertain") && state.uncertainKeys === uncKeys && state.uncertainAt && Date.now() - new Date(state.uncertainAt).getTime() < 24 * 3600 * 1000) {
    console.log("[monitor] 같은 불확실 항목을 24시간 안에 이미 알림 — 이번에는 생략");
    notifiable = [];
  }
  let emailed = 0;
  let telegram: RunResult["telegram"] = "skipped";
  if (verdict !== "none" && notifiable.length) {
    // 텔레그램을 먼저(빠름) — 메일이 시간 제한에 걸려도 운영자 알림은 나간다
    if (telegramConfigured()) {
      const r = await sendTelegram(formatVerdictNotice(run, notifiable));
      telegram = r.dryRun ? "dry-run" : r.ok ? "sent" : "failed";
      if (!r.ok) console.warn("[monitor] 텔레그램 알림 실패", r.error);
    }
    if (notifiable.some((e) => e.kind === "uncertain")) await db.upsert("meta", { ...state, uncertainKeys: uncKeys, uncertainAt: createdAt });
    try {
      const p = await sendUpdateDigest(run, notifiable, { deadline: deadlineFrom(t0) });
      emailed = p.sent;
      if (p.remaining > 0) {
        await db.upsert("meta", { id: "digest_pending", createdAt, runId: run.id, eventIds: notifiable.map((e) => e.id), doneIds: p.doneIds, finished: false });
        console.warn(`[monitor] 메일 ${p.remaining}명 남음 → 다음 실행에서 이어 보냄`);
      }
    } catch (e) {
      console.warn("[monitor] 이메일 알림 실패", (e as Error).message);
    }
  }
  return { run, events, emailed: emailed + resumed, telegram };
}

type NoticeState = Rec & { uncertainKeys?: string; uncertainAt?: string };
type DigestPending = Rec & { runId: string; eventIds: string[]; doneIds: string[]; finished: boolean };

/** 메일 발송 시간 예산: 실행 시작부터 MONITOR_MAIL_BUDGET_MS(기본 200초) — 크론 maxDuration 300초 안에서 여유를 둔다 */
function deadlineFrom(t0: number): number {
  return t0 + (Number(process.env.MONITOR_MAIL_BUDGET_MS) || 200_000);
}

function uncertaintyKeys(list: string[]): string {
  return [...new Set(list.map((u) => u.split(/[:—]/)[0].replace(/\s+/g, " ").trim()))].sort().join("|");
}

/** 지난 실행에서 시간 제한으로 못 보낸 변경 알림 메일을 이어서 보낸다. */
async function resumePendingDigest(t0: number): Promise<number> {
  const db = store();
  const pending = await db.get<DigestPending>("meta", "digest_pending");
  if (!pending || pending.finished) return 0;
  const run = await db.get<MonitorRun>("runs", pending.runId);
  const events = (await db.list<MonitorEvent>("events", { limit: 300 })).filter((e) => pending.eventIds.includes(e.id));
  if (!run || !events.length) {
    await db.update<DigestPending>("meta", pending.id, { finished: true });
    return 0;
  }
  const p = await sendUpdateDigest(run, events, { deadline: deadlineFrom(t0) - 60_000, doneIds: pending.doneIds });
  await db.update<DigestPending>("meta", pending.id, { doneIds: p.doneIds, finished: p.remaining === 0 });
  console.log(`[monitor] 지난 알림 메일 이어 보냄 ${p.sent}건, 남은 ${p.remaining}명`);
  return p.sent;
}

function fmtBool(b: boolean | null | undefined) {
  return b === true ? "있음" : b === false ? "없음" : "확인 불가";
}
