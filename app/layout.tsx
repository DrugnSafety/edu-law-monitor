import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "교원 육아휴직 12세 확대 입법 모니터",
  description: "교육공무원법 위원회 대안(교원 육아휴직 대상 자녀 만 8세→만 12세) 국회 진행 상황을 공식 데이터로 추적하고 시민 응원을 모읍니다.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#142f55" };

const NAV = [
  { href: "/", label: "현황·응원" },
  { href: "/timeline", label: "타임라인" },
  { href: "/news", label: "관련 소식" },
  { href: "/act", label: "행동하기" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
        <header className="z-20 sm:sticky sm:top-0 border-b border-civic-900/20 bg-civic-800 text-white">
          <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="leading-tight">
              <span className="block text-[11px] font-medium tracking-wide text-civic-100/80">교육공무원법 개정 대안 추적</span>
              <span className="block text-base font-bold">교원 육아휴직 12세 확대 입법 모니터</span>
            </Link>
            <nav className="-mx-1 flex gap-1 overflow-x-auto text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-civic-100 hover:bg-white/10 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 pt-4 text-xs leading-relaxed text-slate-500">
          <p>
            의안·회의 정보는 국회사무처 <a className="underline" href="https://open.assembly.go.kr" target="_blank" rel="noreferrer">열린국회정보</a> Open API를 하루 2회(KST 07:00·22:00) 조회해 자동 판정합니다. API 반영은 수일 늦을 수 있어,
            확인되지 않은 사항은 &lsquo;확인 불확실&rsquo;로 표시합니다. &lsquo;추정&rsquo; 표시는 일반 절차에 근거한 예상이며 사실이 아닙니다.
          </p>
          <p className="mt-2">이 사이트는 개인이 운영하는 시민 모니터로 국회·정부와 관계가 없습니다. 자동 전화·자동 문자 발송을 하지 않습니다.</p>
        </footer>
      </body>
    </html>
  );
}
