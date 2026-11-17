import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { recordCallResult } from "@/lib/pickle";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";

// 통화 결과 기록(의원 사무실별 통화완료/부재/거절 + 메모) → 타임라인 공개 항목
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string; name?: string; outcome?: string; memo?: string };
  if (!body.id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const r = await recordCallResult(body.id, body);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  revalidatePath("/timeline");
  return NextResponse.json({ ok: true, result: r.result });
}
