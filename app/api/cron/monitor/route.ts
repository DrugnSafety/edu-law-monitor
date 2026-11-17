import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { checkMilestone } from "@/lib/board";
import { dispatchPacket } from "@/lib/pickle";
import { store } from "@/lib/storage";
import type { ActionPacket } from "@/lib/types";
import { runMonitor } from "@/lib/monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 메일 순차 발송 여유(lib/monitor deadlineFrom)

// Vercel Cron(하루 3회, vercel.json)이 CRON_SECRET을 Authorization: Bearer 헤더로 보낸다.
export async function GET(req: Request) {
  const secret = env("CRON_SECRET");
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { run, events, emailed, telegram } = await runMonitor("cron");
  // 게시 요청 중 텔레그램 발송이 실패해 놓친 마일스톤이 있으면 보충(패킷은 한 번만 생성)
  const packet = await checkMilestone().catch(() => null);
  // 텔레그램 발송이 실패한 채 남은 패킷은 최대 3회까지 다시 시도
  for (const p of await store().list<ActionPacket>("packets").catch(() => [] as ActionPacket[])) {
    if (!p.dispatchedAt && (p.dispatches?.length ?? 0) < 3 && p.status !== "skipped") await dispatchPacket(p.id, run.stage).catch(() => null);
  }
  // 확인이 끝나면 정적 페이지 전체를 다시 만든다(on-demand revalidation)
  revalidatePath("/", "layout");
  return NextResponse.json({ verdict: run.verdict, headline: run.headline, stage: run.stage, events: events.length, emailed, telegram, milestone: packet?.milestone ?? null });
}
