import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/subscribe";

export const dynamic = "force-dynamic";

// 메일 본문·헤더 링크를 브라우저로 열면(GET) 해지 페이지로 보낸다.
// GET만으로는 해지하지 않는다 — 메일 보안 스캐너가 링크를 미리 열어 의도치 않게 해지되는 것을 막기 위함(RFC 8058 §1).
export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get("token") || "";
  return NextResponse.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, u.origin), 303);
}

// POST = 실제 해지.
// - RFC 8058 원클릭(메일 앱): 토큰은 쿼리스트링, 본문은 List-Unsubscribe=One-Click → 200 텍스트
// - 해지 페이지(브라우저): fetch는 200 텍스트, JS 없는 폼 제출(confirm=1)은 첫 화면으로 303
export async function POST(req: Request) {
  const u = new URL(req.url);
  const body = await req.text().catch(() => "");
  const ok = await unsubscribe(u.searchParams.get("token") || "");
  if (/(^|&)confirm=1(&|$)/.test(body)) return NextResponse.redirect(new URL(`/?unsubscribed=${ok ? "1" : "0"}`, u.origin), 303);
  return new Response(ok ? "unsubscribed" : "invalid token", { status: ok ? 200 : 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
