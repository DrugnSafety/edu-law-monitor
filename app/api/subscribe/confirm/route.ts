import { NextResponse } from "next/server";
import { confirm } from "@/lib/subscribe";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = await confirm(u.searchParams.get("token") || "");
  return NextResponse.redirect(new URL(`/?subscribed=${ok ? "1" : "0"}`, u.origin));
}
