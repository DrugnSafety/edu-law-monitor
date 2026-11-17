import { NextResponse } from "next/server";
import { checkMilestone } from "@/lib/board";
import { store } from "@/lib/storage";
import type { ActionPacket } from "@/lib/types";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await checkMilestone(); // 누락된 마일스톤이 있으면 생성(자동 실행 없음)
  return NextResponse.json({ packets: await store().list<ActionPacket>("packets") });
}

// 상태 변경: queued → approved → done (또는 skipped). 실제 통화·문자는 사람이 사이트 밖에서 수행.
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, status, note } = (await req.json().catch(() => ({}))) as { id?: string; status?: ActionPacket["status"]; note?: string };
  if (!id || !status || !["queued", "approved", "done", "skipped"].includes(status)) return NextResponse.json({ error: "id/status 필요" }, { status: 400 });
  const r = await store().update<ActionPacket>("packets", id, { status, note: typeof note === "string" ? note.slice(0, 500) : undefined, updatedAt: new Date().toISOString() });
  return r ? NextResponse.json({ ok: true, packet: r }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
