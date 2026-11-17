import { env } from "./config";
import { newId, store } from "./storage";

// Resend가 설정되어 있으면 실제 발송, 아니면 콘솔 + outbox 컬렉션에 기록
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; via: "resend" | "outbox" }> {
  const key = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM") || "교원 육아휴직 입법 모니터 <onboarding@resend.dev>";
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return { ok: true, via: "resend" };
      console.warn("[email] Resend HTTP", res.status);
    } catch (e) {
      console.warn("[email] Resend 실패", (e as Error).message);
    }
  }
  const masked = to.replace(/^(.).*(@.*)$/, "$1***$2");
  console.log(`[email:outbox] to=${masked} subject=${subject}`);
  await store().insert("outbox", { id: newId("mail_"), createdAt: new Date().toISOString(), to, subject, text });
  return { ok: !key, via: "outbox" };
}
