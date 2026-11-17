"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExtLink, Tag } from "./ui";

export type NewsRow = { id: string; kind: "news" | "blog" | "cafearticle"; title: string; link: string; source?: string; pubDate?: string | null; summary: string; strong?: boolean; collectedAt: string };

const KIND = { news: "뉴스", blog: "블로그", cafearticle: "카페" } as const;
const TABS: [string, string][] = [
  ["", "전체"],
  ["news", "뉴스"],
  ["blog", "블로그"],
  ["cafearticle", "카페"],
];

export default function NewsList({ items }: { items: NewsRow[] }) {
  const kind = useSearchParams().get("kind") || "";
  return <NewsListView items={items} kind={kind} />;
}

/** 서버 HTML에도 목록이 들어가도록 Suspense fallback에서 kind="" 로 그대로 렌더한다 */
export function NewsListView({ items, kind }: { items: NewsRow[]; kind: string }) {
  const shown = items.filter((n) => !kind || n.kind === kind);
  const count = (k: string) => items.filter((n) => !k || n.kind === k).length;
  return (
    <div>
      <nav aria-label="소식 종류" className="flex flex-wrap gap-1 text-[15px]">
        {TABS.map(([k, l]) => (
          <Link
            key={k}
            href={k ? `/news?kind=${k}` : "/news"}
            scroll={false}
            aria-current={kind === k ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 transition-colors duration-150 ${kind === k ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-rule-2 hover:text-ink"}`}
          >
            {l} <span className="tnum opacity-75">{count(k)}</span>
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-ink-3/50 px-4 py-6 text-ink-2">이 종류로 수집된 글이 없습니다.</p>
      ) : (
        <ol className="mt-5 border-t border-ink">
          {shown.map((n) => (
            <li key={n.id} className="cv-auto grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b border-rule py-4 sm:grid-cols-[96px_minmax(0,1fr)]">
              <div className="text-[13px] text-ink-3">
                <span className="tnum block font-semibold text-ink-2">{(n.pubDate || n.collectedAt).slice(0, 10).replace(/-/g, ".").slice(2)}</span>
                <span className="mt-1 block">
                  {KIND[n.kind]}
                  {!n.pubDate && " · 수집일"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold leading-snug">
                  <ExtLink href={n.link}>{n.title}</ExtLink>
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{n.summary}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                  {n.source && <span className="truncate">{n.source}</span>}
                  {n.strong && <Tag tone="green">법안 언급</Tag>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
