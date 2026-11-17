import { NextResponse } from "next/server";
import { featureFlags } from "@/lib/config";
import { store } from "@/lib/storage";
import type { MonitorRun, Subscriber } from "@/lib/types";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = store();
  const runs = await db.list<MonitorRun>("runs", { limit: 10 });
  const subs = await db.list<Subscriber>("subscribers");
  return NextResponse.json({
    storage: db.kind,
    features: featureFlags(),
    subscribers: { confirmed: subs.filter((s) => s.status === "confirmed").length, pending: subs.filter((s) => s.status === "pending").length },
    runs: runs.map((r) => ({ id: r.id, createdAt: r.createdAt, trigger: r.trigger, verdict: r.verdict, headline: r.headline, sources: r.sources })),
  });
}
