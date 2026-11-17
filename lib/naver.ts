import { env, NEWS_QUERIES } from "./config";
import { stripHtml } from "./assembly";
import { sha256 } from "./util";
import type { NewsItem, SourceStatus } from "./types";

const KINDS = ["news", "blog", "cafearticle"] as const;

function toDate(kind: string, it: Record<string, string>): string | null {
  if (kind === "news" && it.pubDate) {
    const d = new Date(it.pubDate);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (it.postdate && /^\d{8}$/.test(it.postdate)) return `${it.postdate.slice(0, 4)}-${it.postdate.slice(4, 6)}-${it.postdate.slice(6, 8)}`;
  return null;
}

// 네이버 검색 API(뉴스·블로그·카페). 키가 없으면 빈 배열 + 소스 상태 "미설정"
export async function searchNaver(sources: SourceStatus[]): Promise<Omit<NewsItem, "createdAt" | "summary">[]> {
  const id = env("NAVER_CLIENT_ID");
  const secret = env("NAVER_CLIENT_SECRET");
  if (!id || !secret) {
    sources.push({ name: "네이버 검색 API", ok: false, detail: "미설정(NAVER_CLIENT_ID/SECRET 없음) — 뉴스 확인 불가" });
    return [];
  }
  const seen = new Map<string, Omit<NewsItem, "createdAt" | "summary">>();
  const errs: string[] = [];
  for (const kind of KINDS) {
    for (const q of NEWS_QUERIES) {
      try {
        const u = new URL(`https://openapi.naver.com/v1/search/${kind}.json`);
        u.searchParams.set("query", q);
        u.searchParams.set("display", "20");
        u.searchParams.set("sort", "date");
        const res = await fetch(u, {
          headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = (await res.json()) as { items?: Record<string, string>[] };
        for (const it of j.items || []) {
          const link = it.originallink || it.link;
          if (!link) continue;
          const key = sha256(link).slice(0, 24);
          if (seen.has(key)) continue;
          const title = stripHtml(it.title);
          const description = stripHtml(it.description);
          // 관련성 필터: 육아휴직/교육공무원법/사립학교법 중 하나는 언급
          if (!/육아휴직|교육공무원법|사립학교법/.test(title + description)) continue;
          seen.set(key, { id: key, kind, title, link, source: it.bloggername || it.cafename || (it.originallink ? new URL(it.originallink).hostname : undefined), pubDate: toDate(kind, it), description, query: q });
        }
      } catch (e) {
        errs.push(`${kind}/${q}: ${(e as Error).message}`);
      }
    }
  }
  sources.push({ name: "네이버 검색 API(news/blog/cafearticle)", ok: errs.length === 0, detail: errs.length ? `일부 실패: ${errs.slice(0, 3).join("; ")}` : `관련 글 ${seen.size}건`, rows: seen.size });
  return [...seen.values()];
}
