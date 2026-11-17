import { NextResponse } from "next/server";
import { latestRun } from "@/lib/data";
import { dispatchPacket } from "@/lib/pickle";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";

// '다시 보내기': 마일스톤 통화 작업을 텔레그램 그룹에 다시 보낸다(발송 이력은 패킷에 누적).
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const r = await dispatchPacket(id, (await latestRun())?.stage);
  if (!r.packet) return NextResponse.json({ error: r.error || "not found" }, { status: 404 });
  return NextResponse.json({ ok: r.ok, error: r.error, dryRun: r.dryRun, packet: r.packet }, { status: r.ok ? 200 : 502 });
}
