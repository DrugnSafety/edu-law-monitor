import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runMonitor } from "@/lib/monitor";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 메일 순차 발송 여유(lib/monitor deadlineFrom)

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { run, events, emailed, telegram } = await runMonitor("admin");
  revalidatePath("/", "layout");
  return NextResponse.json({ verdict: run.verdict, headline: run.headline, stage: run.stage, events: events.map((e) => e.title), emailed, telegram, sources: run.sources });
}
