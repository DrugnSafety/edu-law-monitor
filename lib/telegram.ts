import { env, fmtKst, siteUrl, VERDICTS } from "./config";
import type { MonitorEvent, MonitorRun } from "./types";

// Telegram Bot API(sendMessage, HTML parse mode). 4000자를 넘으면 줄 단위로 나눠 보낸다.
// 포매터는 각 줄 안에서만 태그를 열고 닫으므로 줄 경계에서 잘라도 HTML이 깨지지 않는다.

export const TG_LIMIT = 4000;

export function telegramConfigured(): boolean {
  return !!(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID"));
}

/** TELEGRAM_DRY_RUN=1 이면 실제로 보내지 않고 콘솔에 출력만 한다(로컬 시험용). */
export function telegramDryRun(): boolean {
  return env("TELEGRAM_DRY_RUN") === "1";
}

export function tgEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** NFKC 정규화 + 보이지 않는 문자(제로폭·방향 제어·소프트 하이픈 등) 제거 */
export function normalizeText(s: string): string {
  return s.normalize("NFKC").replace(/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0]/g, "");
}

/**
 * 시민 메모를 텔레그램·AI 통화용으로 정리한다.
 * - 정규화 후 HTML 태그·URL·이메일·@멘션·숫자열(전화번호 등, 띄어쓰기 포함) 제거
 * - @멘션 제거로 메모가 봇(피클)을 직접 부르는 것을 막는다. 길이 제한.
 */
export function sanitizeMemo(s: string, max = 90): string {
  let t = normalizeText(s)
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+|www\.\S+/gi, "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "")
    .replace(/@\S+/g, "")
    .replace(/\+?\d(?:[\s.\-()]*\d){6,}/g, "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    const sp = cut.lastIndexOf(" ");
    t = (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[,.·\s]+$/, "") + "…";
  }
  return t;
}

const INSTRUCTION = /봇|bot|피클|pickle|ai|에이아이|인공지능|비서|운영자|관리자|승인|자동모드|모드|시작하|시작해|중지|멈춰|무시|지시|명령|프롬프트|prompt|system|시스템|전화해|전화걸|전화를걸|통화를|통화해|문자보내|번호로|대상을|대상에|추가해|빼고|바꿔/i;
const PROFANITY = /시발|씨발|씨빨|ㅅㅂ|ㅆㅂ|병신|ㅂㅅ|ㅄ|개새|개색|좆|존나|졸라|꺼져|닥쳐|미친|ㅁㅊ|썅|지랄|ㅈㄹ|염병|fuck|shit|bitch/i;

/**
 * 봇·AI·운영 절차에 지시하려는 듯한 메모(프롬프트 주입 시도)나 욕설은 인용하지 않는다.
 * 띄어쓰기·기호로 쪼갠 우회(예: "피 클", "승.인")도 잡도록 공백·기호를 지운 문자열로도 검사한다.
 */
export function looksLikeInstruction(s: string): boolean {
  const n = normalizeText(s);
  const compact = n.replace(/[\s\p{P}\p{S}]+/gu, "");
  return /@/.test(n) || INSTRUCTION.test(n) || INSTRUCTION.test(compact) || PROFANITY.test(compact);
}

export function chunkMessage(text: string, limit = TG_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    const piece = line.length > limit ? line.replace(/<[^>]+>/g, "").slice(0, limit - 1) + "…" : line;
    if (cur && cur.length + 1 + piece.length > limit) {
      out.push(cur);
      cur = piece;
    } else {
      cur = cur ? `${cur}\n${piece}` : piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export type TgResult = { ok: boolean; messageIds: number[]; error?: string; dryRun?: boolean };

async function callSend(token: string, payload: Record<string, unknown>): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { message_id?: number }; description?: string };
    if (res.ok && j.ok) return { ok: true, id: j.result?.message_id };
    return { ok: false, error: `HTTP ${res.status}${j.description ? ` ${j.description}` : ""}` };
  } catch (e) {
    // 토큰이 들어간 URL은 메시지에 남기지 않는다
    return { ok: false, error: (e as Error).name === "TimeoutError" ? "timeout" : "network error" };
  }
}

export async function sendTelegram(text: string, opts: { chatId?: string; replyTo?: number } = {}): Promise<TgResult> {
  const token = env("TELEGRAM_BOT_TOKEN");
  const chatId = opts.chatId || env("TELEGRAM_CHAT_ID");
  const chunks = chunkMessage(text);
  if (telegramDryRun()) {
    console.log(`[telegram:dry-run] ${chunks.length}개 메시지(발송 안 함)\n` + chunks.join("\n---- (다음 메시지) ----\n"));
    return { ok: true, messageIds: [], dryRun: true };
  }
  if (!token || !chatId) return { ok: false, messageIds: [], error: "TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID 미설정" };
  const ids: number[] = [];
  for (const [i, chunk] of chunks.entries()) {
    const base = { chat_id: chatId, disable_web_page_preview: true, ...(i === 0 && opts.replyTo ? { reply_to_message_id: opts.replyTo } : {}) };
    let r = await callSend(token, { ...base, text: chunk, parse_mode: "HTML" });
    if (!r.ok && /can't parse entities/i.test(r.error || "")) {
      // HTML 파싱 실패 시 태그를 걷어낸 평문으로 한 번 더
      r = await callSend(token, { ...base, text: chunk.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") });
    }
    if (!r.ok) return { ok: false, messageIds: ids, error: r.error };
    if (r.id) ids.push(r.id);
  }
  return { ok: true, messageIds: ids };
}

/** 모니터 판정이 '변화 있음' 또는 '확인 불확실'일 때 보내는 짧은 알림. */
export function formatVerdictNotice(run: MonitorRun, events: MonitorEvent[], base = siteUrl()): string {
  const label = VERDICTS[run.verdict].label;
  const lines = [`<b>[EDULAW-MONITOR] ${tgEscape(label)}</b> · ${tgEscape(fmtKst(run.createdAt))}`, tgEscape(run.headline.replace(/^\[[^\]]+\]\s*/, ""))];
  const shown = events.slice(0, 5);
  if (shown.length) {
    lines.push("");
    for (const e of shown) lines.push(`• ${tgEscape(e.title.slice(0, 140))}`);
    if (events.length > shown.length) lines.push(`• 외 ${events.length - shown.length}건`);
  }
  if (run.verdict === "uncertain" && run.uncertainties.length) {
    lines.push("", `<b>확인 필요</b>: ${tgEscape(run.uncertainties[0].slice(0, 200))}`);
  }
  const outlook = run.outlook.text.replace(/^\[추정\]\s*/, "").split(/(?<=[.다])\s+/)[0] || "";
  if (outlook) lines.push("", `<i>다음 예상(추정): ${tgEscape(outlook.slice(0, 200))}</i>`);
  lines.push("", `${base}/timeline`);
  return lines.join("\n");
}
