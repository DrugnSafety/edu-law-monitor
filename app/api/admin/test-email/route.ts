import { NextResponse } from "next/server";
import { sendTestMail } from "@/lib/mail";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let to = "";
  try {
    const body = await req.json();
    to = typeof body?.to === "string" ? body.to.trim() : "";
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!EMAIL_RE.test(to)) return NextResponse.json({ error: "이메일 주소를 확인해 주세요." }, { status: 400 });
  const r = await sendTestMail(to);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
