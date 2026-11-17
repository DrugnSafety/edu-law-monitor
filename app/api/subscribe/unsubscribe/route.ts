import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/subscribe";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = await unsubscribe(u.searchParams.get("token") || "");
  return NextResponse.redirect(new URL(`/?unsubscribed=${ok ? "1" : "0"}`, u.origin));
}
