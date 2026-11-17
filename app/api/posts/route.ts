import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { boardStats, createPost, listPublicPosts } from "@/lib/board";
import { clientIp, hashIp } from "@/lib/util";

export const dynamic = "force-dynamic";

// '메모 더 보기'를 눌렀을 때만 호출된다(자동 새로고침·폴링 없음).
export async function GET(req: Request) {
  const limit = Math.min(300, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 100));
  const [posts, stats] = await Promise.all([listPublicPosts(limit), boardStats()]);
  return NextResponse.json({ posts, stats });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const r = await createPost(body, hashIp(clientIp(req)));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  // 정적(ISR) 페이지의 게시판·게이지를 바로 갱신
  revalidatePath("/");
  revalidatePath("/act");
  return NextResponse.json({ post: r.post, stats: await boardStats(), milestone: r.packet ? r.packet.milestone : null });
}
