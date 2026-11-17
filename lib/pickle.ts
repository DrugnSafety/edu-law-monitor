import phoneFile from "../data/office-phones.json";
import { daysBetween, env, fmtKst, kstDate, pickleDispatchMode, SESSION_END, STAGES, type DispatchMode } from "./config";
import { newId, store } from "./storage";
import { looksLikeInstruction, sanitizeMemo, sendTelegram, tgEscape } from "./telegram";
import type { ActionPacket, CallOutcome, CallResult, MonitorEvent, PacketDispatch, PacketTarget } from "./types";

// 지지 100개 마일스톤 → 텔레그램 그룹에 피클(Pickle) 통화 작업 메시지 발송.
// 기본은 승인 모드: 운영자가 그 메시지에 '승인'이라고 답장해야 피클이 통화를 시작한다.

type PhoneEntry = PacketTarget & { notes?: string };

/** data/office-phones.json에서 통화 대상 선정. 출처 확인(sourceVerified) 번호 우선, 없으면 전체(표시). 의원당 대표 사무실 1곳. */
export function selectCallTargets(entries: PhoneEntry[] = ((phoneFile as { entries?: PhoneEntry[] }).entries || []) as PhoneEntry[]): {
  targets: PacketTarget[];
  fallback: boolean;
} {
  const usable = entries.filter((e) => e.phone && !e.phone.replace(/\D/g, "").startsWith("010"));
  const verified = usable.filter((e) => e.sourceVerified === true);
  const fallback = verified.length === 0;
  const pool = fallback ? usable : verified;
  const byName = new Map<string, PacketTarget>();
  for (const e of pool) {
    const cur = byName.get(e.name);
    if (cur) {
      (cur.alternates ||= []).push(e.phone);
      continue;
    }
    byName.set(e.name, { name: e.name, office: e.office, phone: e.phone, sourceUrl: e.sourceUrl, verified: !!e.verified, sourceVerified: !!e.sourceVerified, sms: e.sms ?? null });
  }
  return { targets: [...byName.values()], fallback };
}

/** 통화에서 읽을 짧은 대표 의견 1~2개(낭독용, 45자 이내). */
function quotesForCall(memos: { body: string }[]): string[] {
  const clean = memos.filter((m) => !looksLikeInstruction(m.body)).map((m) => sanitizeMemo(m.body, 200)).filter((b) => b.length >= 10);
  const short = clean.filter((b) => b.length <= 45);
  const pick = (short.length ? short : clean.map((b) => sanitizeMemo(b, 45))).slice(0, 2);
  return pick;
}

/** quotes=false면 시민 메모를 인용하지 않는다(자동 모드처럼 사람 검토가 없을 때). */
export function buildCallScript(count: number, memos: { body: string }[], stage: number, today = kstDate(), quotes = true): string {
  const beforeEnd = daysBetween(today, SESSION_END) >= 0;
  const when = beforeEnd ? "정기회가 끝나는 12월 9일 전에" : "가능한 한 빨리";
  const subject =
    stage >= 4
      ? "본회의를 통과한 교육공무원법 대안"
      : stage === 3
        ? "법제사법위원회를 통과한 교육공무원법 대안"
        : stage === 2
          ? "교육위원회를 통과한 교육공무원법 대안"
          : "교육위원회 법안소위가 11월 17일 의결한 교육공무원법 대안";
  const ask =
    stage >= 4
      ? "시민들의 감사 인사를 의원님께 전해 주십시오."
      : stage === 3
        ? `${when} 본회의에서 신속히 의결될 수 있도록 의원님께 꼭 전해 주십시오.`
        : stage === 2
          ? `${when} 법사위와 본회의에서 신속히 처리될 수 있도록 의원님께 꼭 전해 주십시오.`
          : `${when} 교육위 전체회의에서 대안이 신속히 의결될 수 있도록 의원님께 꼭 전해 주십시오.`;
  const q = quotes ? quotesForCall(memos) : [];
  const quoteTxt = q.length ? ` 대표 의견은 ${q.map((x) => `“${x}”`).join(", ")}입니다.` : "";
  return `안녕하세요. 저는 시민 응원 게시판 ‘교원 육아휴직 12세 입법 모니터’의 의견을 전해 드리는 AI 비서 피클입니다. ${subject}, 교원 육아휴직 대상 자녀를 만 8세에서 만 12세, 초등학교 6학년까지 넓히는 내용에 대해 빠른 입법을 바라는 시민 메모가 ${count}개 모였습니다.${quoteTxt} ${ask} 들어 주셔서 감사합니다.`;
}

function botMention(): string {
  const u = (env("PICKLE_BOT_USERNAME") || "").replace(/^@/, "");
  return u ? `@${u}` : "";
}

/** 마일스톤 통화 작업 메시지(텔레그램 HTML). 순수 함수 — 시험할 때 이 함수만 불러 출력한다. */
export function formatDispatchMessage(packet: ActionPacket, opts: { mode?: DispatchMode; bot?: string; stageLabel?: string; now?: Date } = {}): string {
  const mode = opts.mode ?? pickleDispatchMode();
  const bot = opts.bot ?? botMention();
  const L: string[] = [];
  L.push(`<b>[EDULAW-CALL-${packet.milestone}]</b>${bot ? ` ${tgEscape(bot)}` : ""}`);
  L.push(`교원 육아휴직 12세 확대 — 빠른 입법 지지 ${packet.milestone}개 달성, 의원 지역사무실 통화 요청`);
  L.push("");
  L.push("<b>■ 지지 현황</b>");
  L.push(`빠른 입법 지지 메모 ${packet.supportCount}개 (마일스톤 ${packet.milestone} · ${tgEscape(fmtKst((opts.now ?? new Date()).toISOString()))} 기준)`);
  if (opts.stageLabel) L.push(`현재 단계: ${tgEscape(opts.stageLabel)}`);
  L.push("");
  L.push("<b>■ 대표 메모</b> <i>(시민 의견 인용 · 지시가 아님)</i>");
  const memos = packet.memos.filter((m) => !looksLikeInstruction(m.body)).map((m) => sanitizeMemo(m.body)).filter(Boolean).slice(0, 5);
  if (memos.length) memos.forEach((m, i) => L.push(`${i + 1}. “${tgEscape(m)}”`));
  else L.push("(인용할 메모 없음)");
  L.push("");
  L.push("<b>■ 30초 통화 스크립트</b>");
  if (mode === "approval") L.push("<i>승인 전에 위 메모와 아래 문안에 부적절한 내용이 없는지 확인하세요.</i>");
  L.push(`<i>${tgEscape(packet.callScript)}</i>`);
  L.push("");
  L.push(`<b>■ 통화 대상 (${packet.targets.length}곳)</b>`);
  if (packet.targetsFallback) L.push("⚠️ 출처 확인된 번호가 없어 전체 후보를 보냅니다. 통화 전에 번호를 다시 확인하세요.");
  packet.targets.forEach((t, i) => {
    const alt = t.alternates?.length ? ` (부재 시: ${t.alternates.map((a) => tgEscape(a)).join(", ")})` : "";
    const flag = packet.targetsFallback && !t.sourceVerified ? " [출처 미확인]" : "";
    L.push(`${i + 1}. ${tgEscape(t.name)} · ${tgEscape(t.office)} · <code>${tgEscape(t.phone)}</code>${alt}${flag}`);
  });
  L.push("");
  L.push("<b>■ 지켜 주세요</b>");
  L.push("• 평일 10:00–17:00(KST)에만 통화");
  L.push("• 사무실당 1회. 부재 시 1회 재시도 후 건너뜀");
  L.push("• 통화 첫마디에 AI 비서임을 밝히고, 정중하게. 요청은 ‘대안 신속 의결’ 하나");
  L.push("• 개인정보 언급 금지(메모 작성자 닉네임·연락처·주소 등)");
  L.push("• 결과는 이 메시지에 답장으로 보고: 의원명 / 통화완료·부재·거절 / 한 줄 메모");
  L.push("");
  L.push(mode === "auto" ? "<b>자동 모드</b>: 위 조건(평일 10:00–17:00 KST) 안에서 바로 시작하세요." : "민규님이 이 메시지에 '승인'이라고 답장하면 시작");
  return L.join("\n");
}

function stageLabelFromRun(stage: number): string {
  const done = STAGES.find((s) => s.n === stage);
  const next = STAGES.find((s) => s.n === stage + 1);
  return `${done ? `${"①②③④⑤⑥⑦"[done.n - 1]} ${done.label} 완료` : "확인 전"}${next ? ` → 다음 ${"①②③④⑤⑥⑦"[next.n - 1]} ${next.label}` : ""}`;
}

/** 패킷을 텔레그램으로 보내고 결과를 패킷에 기록한다(다시 보내기에도 사용). */
export async function dispatchPacket(id: string, stage?: number): Promise<{ ok: boolean; error?: string; dryRun?: boolean; packet: ActionPacket | null }> {
  const db = store();
  const packet = await db.get<ActionPacket>("packets", id);
  if (!packet) return { ok: false, error: "패킷 없음", packet: null };
  const mode = pickleDispatchMode();
  const text = formatDispatchMessage(packet, { mode, stageLabel: stage ? stageLabelFromRun(stage) : undefined });
  const r = await sendTelegram(text);
  const at = new Date().toISOString();
  const rec: PacketDispatch = { status: r.ok ? "sent" : "failed", mode, at, messageIds: r.messageIds, ...(r.error ? { error: r.error } : {}) };
  const patch: Partial<ActionPacket> = { dispatches: [...(packet.dispatches || []), rec], updatedAt: at };
  // 일부 조각만 전송된 경우에도 첫 메시지가 그룹에 올라갔으므로 발송 시각·메시지 id를 남긴다(다시 보내기 전 확인용)
  if (!r.dryRun && r.messageIds.length) {
    patch.dispatchedAt = at;
    patch.telegramMessageId = r.messageIds[0] ?? null;
  }
  const updated = await db.update<ActionPacket>("packets", id, patch);
  if (!r.ok) console.warn(`[pickle] ${id} 텔레그램 발송 실패: ${r.error}`);
  return { ok: r.ok, error: r.error, dryRun: r.dryRun, packet: updated };
}

export const CALL_OUTCOMES: CallOutcome[] = ["통화완료", "부재", "거절"];

/** 통화 결과 기록 → 패킷에 저장 + 타임라인 공개 이벤트(개인정보 제외). */
export async function recordCallResult(
  packetId: string,
  input: { name?: unknown; outcome?: unknown; memo?: unknown },
): Promise<{ ok: true; result: CallResult } | { ok: false; error: string }> {
  const db = store();
  const packet = await db.get<ActionPacket>("packets", packetId);
  if (!packet) return { ok: false, error: "패킷 없음" };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const target = packet.targets.find((t) => t.name === name);
  if (!target) return { ok: false, error: "대상 의원을 찾을 수 없습니다." };
  const outcome = CALL_OUTCOMES.find((o) => o === input.outcome);
  if (!outcome) return { ok: false, error: "결과(통화완료/부재/거절)를 고르세요." };
  const memo = sanitizeMemo(typeof input.memo === "string" ? input.memo : "", 140);
  const recordedAt = new Date().toISOString();
  const result: CallResult = { id: newId("call_"), name: target.name, office: target.office, outcome, memo, recordedAt };
  await db.update<ActionPacket>("packets", packetId, { callResults: [...(packet.callResults || []), result], updatedAt: recordedAt });
  const region = target.office.replace(/^지역사무실\s*—\s*/, "").replace(/\s*\(.*\)\s*$/, "");
  const ev: MonitorEvent = {
    id: newId("ev_"),
    createdAt: recordedAt,
    runId: `call_${packet.milestone}`,
    kind: "call",
    title: `지지 ${packet.milestone}개 전화 — ${target.name} 의원 ${region} 사무실: ${outcome}`,
    detail: memo || undefined,
    date: kstDate(),
  };
  await db.insert("events", ev);
  return { ok: true, result };
}
