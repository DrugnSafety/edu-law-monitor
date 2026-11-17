import { env, NEWS_QUERIES } from "./config";
import { stripHtml } from "./assembly";
import { sha256 } from "./util";
import type { NewsItem, SourceStatus } from "./types";

const KINDS = ["news", "blog", "cafearticle"] as const;

/**
 * 관련성 판정(제목 T, 설명 D).
 * strong — 이 법안 자체를 다룬 글만. '변화 있음' 판정·알림 근거가 된다.
 *   ① 본문이 교육공무원법·사립학교법과 12세·초6을 함께 언급, 또는
 *   ② 제목이 육아휴직 + 법률명을 다루며 개정·국회 심사를 언급, 또는
 *   ③ 제목이 육아휴직 + (12세·초6 또는 교원·교육공무원)을 다루고, 글 전체에 12세·초6과 확대·개정·국회 심사가 함께 나옴.
 *   일반 '교원 육아휴직 신청 방법' 글이나 '6학년 딸 키우는 교사' 글은 strong이 아니다.
 * weak — 교원 육아휴직 관련 글(목록에만 표시).
 */
const LEAVE = /육아\s*휴직|육휴/;
const TEACHER = /교원|교사|교육공무원|교직원|교육전문직|선생님|교직/;
const AGE = /만\s*12세|12세|초등학교?\s*6학년|초6|6학년\s*(까지|이하)/;
const LAW = /교육공무원법|사립학교법/;
const CHANGE = /확대|개정|상향|대안|발의|국회|교육위|법사위|본회의|소위|의결|통과|입법/;
export function relevance(title: string, description = ""): "strong" | "weak" | null {
  const all = `${title} ${description}`;
  if (!LEAVE.test(all)) return null;
  const lawTopic = LAW.test(all) && AGE.test(all);
  const titleTopic =
    LEAVE.test(title) && ((LAW.test(title) && CHANGE.test(all)) || ((AGE.test(title) || /교원|교육공무원/.test(title)) && AGE.test(all) && CHANGE.test(all)));
  if (lawTopic || titleTopic) return "strong";
  if (TEACHER.test(all) && (TEACHER.test(title) || (LEAVE.test(title) && (AGE.test(all) || LAW.test(all))))) return "weak";
  return null;
}

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
          const rel = relevance(title, description);
          if (!rel) continue;
          seen.set(key, { id: key, kind, title, link, source: it.bloggername || it.cafename || (it.originallink ? new URL(it.originallink).hostname : undefined), pubDate: toDate(kind, it), description, query: q, strong: rel === "strong" });
        }
      } catch (e) {
        errs.push(`${kind}/${q}: ${(e as Error).message}`);
      }
    }
  }
  sources.push({ name: "네이버 검색 API(news/blog/cafearticle)", ok: errs.length === 0, detail: errs.length ? `일부 실패: ${errs.slice(0, 3).join("; ")}` : `관련 글 ${seen.size}건`, rows: seen.size });
  return [...seen.values()];
}
