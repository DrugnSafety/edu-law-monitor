import nodemailer, { type Transporter } from "nodemailer";
import { env, siteUrl } from "./config";
import { confirmMail, digestMail } from "./email-templates";
import { newId, store } from "./storage";
import type { MonitorEvent, MonitorRun, Subscriber } from "./types";

export type MailVia = "smtp" | "resend" | "outbox";
export type SendResult = { ok: boolean; via: MailVia; error?: string };

const g = globalThis as unknown as { __elmMailer?: { key: string; t: Transporter } };

export function mailTransportKind(): MailVia {
  if (env("SMTP_USER") && env("SMTP_PASS")) return "smtp";
  if (env("RESEND_API_KEY")) return "resend";
  return "outbox";
}

function mask(to: string): string {
  return to.replace(/^(.).*(@.*)$/, "$1***$2");
}

function smtpTransporter(): Transporter {
  const host = env("SMTP_HOST") || "smtp.gmail.com";
  const port = Number(env("SMTP_PORT")) || 465;
  const user = env("SMTP_USER")!;
  const key = `${host}:${port}:${user}`;
  if (g.__elmMailer?.key !== key) {
    g.__elmMailer = { key, t: nodemailer.createTransport({ host, port, secure: port === 465, pool: false, auth: { user, pass: env("SMTP_PASS")! } }) };
  }
  return g.__elmMailer.t;
}

export async function sendEmail(to: string, subject: string, html: string, text: string, opts?: { headers?: Record<string, string> }): Promise<SendResult> {
  const kind = mailTransportKind();
  if (kind === "smtp") {
    const from = env("EMAIL_FROM") || `"교원 육아휴직 입법 모니터" <${env("SMTP_USER")}>`;
    try {
      await smtpTransporter().sendMail({ from, to, subject, html, text, headers: opts?.headers });
      return { ok: true, via: "smtp" };
    } catch (e) {
      const error = (e as Error).message;
      console.warn(`[mail] SMTP 실패 to=${mask(to)}: ${error}`);
      return { ok: false, via: "smtp", error };
    }
  }
  if (kind === "resend") {
    const from = env("EMAIL_FROM") || "교원 육아휴직 입법 모니터 <onboarding@resend.dev>";
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text, ...(opts?.headers ? { headers: opts.headers } : {}) }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return { ok: true, via: "resend" };
      console.warn(`[mail] Resend HTTP ${res.status} to=${mask(to)}`);
      return { ok: false, via: "resend", error: `HTTP ${res.status}` };
    } catch (e) {
      const error = (e as Error).message;
      console.warn(`[mail] Resend 실패 to=${mask(to)}: ${error}`);
      return { ok: false, via: "resend", error };
    }
  }
  console.log(`[mail:outbox] to=${mask(to)} subject=${subject}`);
  await store().insert("outbox", { id: newId("mail_"), createdAt: new Date().toISOString(), to, subject, text });
  return { ok: true, via: "outbox" };
}

export async function sendConfirmMail(email: string, token: string): Promise<SendResult> {
  const link = `${siteUrl()}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;
  const m = confirmMail(link);
  return sendEmail(email, m.subject, m.html, m.text);
}

function unsubUrl(base: string, token: string): string {
  return `${base}/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`;
}

function listHeaders(url: string): Record<string, string> {
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type DigestProgress = { sent: number; doneIds: string[]; remaining: number };

/**
 * 확인된 구독자에게만 순차 발송. 발송 시점 판단은 호출자 책임.
 * deadline(ms epoch)을 넘기면 멈추고, 남은 수를 돌려준다 → 호출자가 다음 실행에서 이어 보냄.
 * doneIds에 있는 구독자는 건너뛴다(이어 보내기용).
 */
export async function sendUpdateDigest(run: MonitorRun, events: MonitorEvent[], opts: { deadline?: number; doneIds?: string[] } = {}): Promise<DigestProgress> {
  const done = new Set(opts.doneIds || []);
  const subs = (await store().list<Subscriber>("subscribers")).filter((s) => s.status === "confirmed" && !done.has(s.id));
  if (!subs.length) return { sent: 0, doneIds: [...done], remaining: 0 };
  const base = siteUrl();
  const delay = Math.max(0, Number(env("MAIL_DELAY_MS") ?? 1500));
  const cap = Math.max(0, Number(env("MAIL_MAX_PER_RUN") ?? 450));
  const targets = subs.slice(0, cap);
  let sent = 0;
  for (let i = 0; i < targets.length; i++) {
    if (opts.deadline && Date.now() > opts.deadline) break;
    const s = targets[i];
    const header = unsubUrl(base, s.token);
    const body = `${base}/unsubscribe?token=${encodeURIComponent(s.token)}`;
    const m = digestMail({ run, events, base, unsubscribeUrl: body });
    const r = await sendEmail(s.email, m.subject, m.html, m.text, { headers: listHeaders(header) });
    done.add(s.id);
    if (r.ok) sent++;
    if (i < targets.length - 1 && delay && r.via !== "outbox") await sleep(delay);
  }
  const remaining = subs.filter((s) => !done.has(s.id)).length;
  console.log(`[mail] digest 발송 ${sent}건, 남은 구독자 ${remaining}명 (${mailTransportKind()})`);
  return { sent, doneIds: [...done], remaining };
}

export async function sendTestMail(to: string): Promise<SendResult> {
  const base = siteUrl();
  const [latest] = await store().list<MonitorRun>("runs", { limit: 1 });
  const run: MonitorRun = latest ?? sampleRun();
  const events: MonitorEvent[] = latest ? [] : [{ id: "sample", createdAt: run.createdAt, runId: run.id, kind: "stage", title: "샘플 항목: 소위 대안 의결 확인(예시)", detail: "실제 데이터가 아닌 예시 문구입니다." }];
  const url = unsubUrl(base, "test");
  const m = digestMail({ run, events, base, unsubscribeUrl: `${base}/unsubscribe?token=test`, test: true });
  return sendEmail(to, m.subject, m.html, m.text, { headers: listHeaders(url) });
}

function sampleRun(): MonitorRun {
  const now = new Date().toISOString();
  return {
    id: "sample", createdAt: now, kstDate: now.slice(0, 10), trigger: "cli", verdict: "uncertain",
    headline: "샘플: 실행 기록이 없어 예시 내용으로 구성한 테스트 메일", reasons: [], uncertainties: [], notes: [], stage: 1,
    stages: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ n, label: `단계 ${n}`, status: n === 1 ? "done" : n === 2 ? "in_progress" : "pending", date: n === 1 ? now.slice(0, 10) : null })),
    baselineBills: [], alternatives: [], meetings: [], sources: [],
    outlook: { text: "샘플 문구입니다. 실제 전망은 모니터 실행 후 표시됩니다.", generatedBy: "rule" }, newsNew: 0, durationMs: 0,
  };
}

