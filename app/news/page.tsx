import { Suspense } from "react";
import NewsList, { NewsListView, type NewsRow } from "@/components/NewsList";
import { Notice } from "@/components/ui";
import { CHECK_TIMES_KST, featureFlags, kstDate } from "@/lib/config";
import { store } from "@/lib/storage";
import type { NewsItem } from "@/lib/types";

export const revalidate = 3600;
export const metadata = { title: "관련 소식 · 교원 육아휴직 12세 입법 모니터" };

export default async function News() {
  const flags = featureFlags();
  const all = await store()
    .list<NewsItem>("news", { limit: 400 })
    .catch(() => []);
  // 카페 글은 검색 API가 작성일을 주지 않아 '처음 수집한 날'로 정렬·표시한다
  const kst = (v: string) => (v.length === 10 ? v : kstDate(new Date(v)));
  const day = (n: NewsItem) => kst(n.pubDate || n.createdAt);
  const items: NewsRow[] = all
    .sort((a, b) => day(b).localeCompare(day(a)) || (b.strong ? 1 : 0) - (a.strong ? 1 : 0))
    .slice(0, 150)
    .map(({ id, kind, title, link, source, pubDate, summary, strong, createdAt }) => ({ id, kind, title, link, source, pubDate: pubDate ? kst(pubDate) : null, summary, strong, collectedAt: kst(createdAt) }));
  return (
    <div className="pt-10 sm:pt-14">
      <p className="text-[13px] font-semibold text-grid">네이버 뉴스 · 블로그 · 카페</p>
      <h1 className="mt-2 font-serif text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">관련 소식</h1>
      <p className="mt-3 max-w-[40em] text-[16px] leading-relaxed text-ink-2">
        ‘교원 육아휴직’과 이 법안을 함께 언급한 새 글을 하루 3회({CHECK_TIMES_KST.join(" · ")}) 모읍니다. 요약은 검색 결과 설명을 줄인 것이며, 원문에서 사실을 확인하세요.
      </p>
      {!flags.naver && (
        <div className="mt-5">
          <Notice tone="warn">네이버 검색 API가 설정되지 않아 새 글을 모으지 못하고 있습니다.</Notice>
        </div>
      )}
      <div className="mt-8">
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-ink-3/50 px-4 py-6 text-ink-2">아직 수집된 글이 없습니다. 다음 확인 때 다시 찾아봅니다.</p>
        ) : (
          <Suspense fallback={<NewsListView items={items} kind="" />}>
            <NewsList items={items} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
