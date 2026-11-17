import { NextResponse } from "next/server";
import { store } from "@/lib/storage";
import type { Post } from "@/lib/types";
import { isAdmin } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const posts = (await store().list<Post>("posts", { limit: 300 })).map(({ ipHash, ...p }) => ({ ...p, ipTag: ipHash.slice(0, 6) }));
  return NextResponse.json({ posts });
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, hidden } = (await req.json().catch(() => ({}))) as { id?: string; hidden?: boolean };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const r = await store().update<Post>("posts", id, { hidden: !!hidden });
  return r ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "not found" }, { status: 404 });
}
