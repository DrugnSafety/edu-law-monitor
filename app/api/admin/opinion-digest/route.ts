import { NextResponse } from "next/server";
import { sendOpinionDigest } from "@/lib/opinion-digest";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// 관리자 수동 발송. body: { onlyNew?: boolean } (기본 true: 지난 요약 이후 새 의견만, false: 전체)
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { onlyNew?: boolean } = {};
  try {
    body = await req.json();
  } catch {}
  const r = await sendOpinionDigest({ force: true, onlyNew: body.onlyNew !== false });
  return NextResponse.json(r);
}
