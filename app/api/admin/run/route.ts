import { NextResponse } from "next/server";
import { runMonitor } from "@/lib/monitor";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { run, events, emailed } = await runMonitor("admin");
  return NextResponse.json({ verdict: run.verdict, headline: run.headline, stage: run.stage, events: events.map((e) => e.title), emailed, sources: run.sources });
}
