import { NextResponse } from "next/server";
import { boardStats, createPost, listPublicPosts } from "@/lib/board";
import { clientIp, hashIp } from "@/lib/util";

export const dynamic = "force-dynamic";

export async function GET() {
  const [posts, stats] = await Promise.all([listPublicPosts(100), boardStats()]);
  return NextResponse.json({ posts, stats });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const r = await createPost(body, hashIp(clientIp(req)));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ post: r.post, stats: await boardStats(), milestone: r.packet ? r.packet.milestone : null });
}
