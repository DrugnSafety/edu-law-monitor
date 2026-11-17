import { randomBytes } from "crypto";
import { siteUrl } from "./config";
import { sendEmail } from "./email";
import { store } from "./storage";
import type { Subscriber } from "./types";
import { sha256 } from "./util";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function subscribe(emailRaw: unknown): Promise<{ ok: boolean; status: number; message: string }> {
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return { ok: false, status: 400, message: "이메일 주소를 확인해 주세요." };
  const db = store();
  const id = "s_" + sha256(email).slice(0, 24);
  const existing = await db.get<Subscriber>("subscribers", id);
  if (existing?.status === "confirmed") return { ok: true, status: 200, message: "이미 구독 중입니다." };
  if (existing?.status === "pending" && Date.now() - new Date(existing.createdAt).getTime() < 10 * 60 * 1000)
    return { ok: true, status: 200, message: "확인 메일을 이미 보냈습니다. 메일함을 확인해 주세요." };
  const token = randomBytes(24).toString("base64url");
  const sub: Subscriber = { id, createdAt: new Date().toISOString(), email, status: "pending", token };
  await db.upsert("subscribers", sub);
  const link = `${siteUrl()}/api/subscribe/confirm?token=${encodeURIComponent(token)}`;
  await sendEmail(
    email,
    "[교원 육아휴직 입법 모니터] 구독 확인",
    `<div style="font-family:sans-serif;line-height:1.6"><p>교원 육아휴직 12세 확대 입법 모니터 알림 구독을 요청하셨습니다.</p><p><a href="${link}">여기를 눌러 구독을 확인</a>해 주세요. 본인이 요청하지 않았다면 이 메일을 무시하면 됩니다.</p></div>`,
    `구독 확인 링크: ${link}\n본인이 요청하지 않았다면 무시하세요.`,
  );
  return { ok: true, status: 200, message: "확인 메일을 보냈습니다. 메일의 링크를 눌러야 구독이 완료됩니다." };
}

async function byToken(token: string): Promise<Subscriber | null> {
  if (!token) return null;
  return (await store().list<Subscriber>("subscribers")).find((s) => s.token === token) || null;
}

export async function confirm(token: string): Promise<boolean> {
  const s = await byToken(token);
  if (!s || s.status === "unsubscribed") return false;
  await store().update<Subscriber>("subscribers", s.id, { status: "confirmed", confirmedAt: new Date().toISOString() });
  return true;
}

export async function unsubscribe(token: string): Promise<boolean> {
  const s = await byToken(token);
  if (!s) return false;
  await store().update<Subscriber>("subscribers", s.id, { status: "unsubscribed" });
  return true;
}
