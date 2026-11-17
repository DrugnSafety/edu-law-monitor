import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { runMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Vercel Cron은 CRON_SECRET이 설정되면 Authorization: Bearer <CRON_SECRET> 헤더를 보낸다.
export async function GET(req: Request) {
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { run, events, emailed } = await runMonitor("cron");
  return NextResponse.json({ verdict: run.verdict, headline: run.headline, stage: run.stage, events: events.length, emailed });
}
