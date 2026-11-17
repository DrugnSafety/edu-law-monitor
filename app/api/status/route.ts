import { NextResponse } from "next/server";
import { store } from "@/lib/storage";
import type { MonitorRun } from "@/lib/types";

export const dynamic = "force-dynamic";
export async function GET() {
  const run = (await store().list<MonitorRun>("runs", { limit: 1 }))[0];
  if (!run) return NextResponse.json({ run: null });
  const { baselineBills, alternatives, ...rest } = run;
  return NextResponse.json({ run: { ...rest, alternatives: alternatives.map(({ summary, ...a }) => a), baselineBills } });
}
