import { NextResponse } from "next/server";
import { subscribe } from "@/lib/subscribe";
import { clientIp, hashIp } from "@/lib/util";

export const dynamic = "force-dynamic";
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  const ip = hashIp(clientIp(req));
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  if (arr.length >= 5) return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });
  hits.set(ip, [...arr, now]);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website) return NextResponse.json({ error: "요청을 처리할 수 없습니다." }, { status: 400 });
  const r = await subscribe(body.email);
  return NextResponse.json(r.ok ? { message: r.message } : { error: r.message }, { status: r.status });
}
