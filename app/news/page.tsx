import { Card, ExtLink, Pill } from "@/components/ui";
import { featureFlags } from "@/lib/config";
import { store } from "@/lib/storage";
import type { NewsItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "관련 소식 · 교원 육아휴직 입법 모니터" };

const KIND = { news: "뉴스", blog: "블로그", cafearticle: "카페" } as const;

export default async function News({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const flags = featureFlags();
  const all = await store().list<NewsItem>("news", { limit: 400 });
  const items = all
    .filter((n) => !kind || n.kind === kind)
    .sort((a, b) => (b.pubDate || b.createdAt).localeCompare(a.pubDate || a.createdAt))
    .slice(0, 150);
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-civic-900">관련 소식</h1>
      {!flags.naver && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">네이버 검색 API가 아직 설정되지 않아 새 글을 수집하지 못하고 있습니다(운영자 설정 필요).</div>
      )}
      <div className="flex gap-1 text-sm">
        {[["", "전체"], ["news", "뉴스"], ["blog", "블로그"], ["cafearticle", "카페"]].map(([k, l]) => (
          <a key={k} href={k ? `/news?kind=${k}` : "/news"} className={`rounded-md px-3 py-1.5 ${(kind || "") === k ? "bg-civic-600 font-semibold text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
            {l}
          </a>
        ))}
      </div>
      <Card>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">수집된 글이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Pill tone={n.kind === "news" ? "green" : "slate"}>{KIND[n.kind]}</Pill>
                  <span>{n.pubDate ? n.pubDate.slice(0, 10) : "날짜 확인 불가"}</span>
                  {n.source && <span>· {n.source}</span>}
                </div>
                <p className="mt-1 text-sm font-semibold">
                  <ExtLink href={n.link}>{n.title}</ExtLink>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
