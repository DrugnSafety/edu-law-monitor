import type { Metadata, Viewport } from "next";
import { Gowun_Batang } from "next/font/google";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import { InkFilter, SealMark } from "@/components/ui";
import { CHECK_TIMES_KST, daysBetween, kstDate, SESSION_END } from "@/lib/config";
import "./globals.css";

// 한글 폰트는 유니코드 구간별 조각 파일이 100여 개라 미리 불러오지 않는다(쓰는 글자의 조각만 받음)
const gowun = Gowun_Batang({ weight: ["400", "700"], subsets: ["latin"], display: "swap", variable: "--font-gowun", preload: false });

export const metadata: Metadata = {
  title: "교원 육아휴직 12세 입법 모니터",
  description: "교원 육아휴직 대상 자녀를 만 8세(초2)에서 만 12세(초6)로 넓히는 교육공무원법 위원회 대안의 국회 진행 단계를 공식 데이터로 추적하고, 시민 응원을 모읍니다.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f3f5ef" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const dday = daysBetween(kstDate(), SESSION_END);
  return (
    <html lang="ko" className={gowun.variable}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-screen bg-paper font-sans text-[15px] leading-relaxed text-ink antialiased sm:text-base">
        <a href="#main" className="skip-link">
          본문으로 건너뛰기
        </a>
        <InkFilter />
        <header className="border-b border-rule bg-paper/95">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 pb-2 pt-4 sm:px-8 sm:py-4">
            <Link href="/" className="group mr-auto flex items-center gap-2.5 rounded-md">
              <SealMark />
              <span className="leading-tight">
                <span className="block font-serif text-[17px] font-bold tracking-tight text-ink sm:text-lg">교원 육아휴직 12세 입법 모니터</span>
                <span className="block text-xs text-ink-3">교육공무원법 위원회 대안 추적</span>
              </span>
            </Link>
            <p className="order-3 hidden shrink-0 rounded-full border border-seal/40 px-2.5 py-0.5 text-xs font-semibold text-seal-ink sm:block" title="정기회 종료일 2026-12-09">
              정기회 종료 {dday > 0 ? <span className="tnum">D-{dday}</span> : dday === 0 ? "오늘" : "지남"}
            </p>
            <NavLinks />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
          {children}
        </main>
        <footer className="border-t border-rule">
          <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 text-[13px] leading-relaxed text-ink-3 sm:grid-cols-[1fr_1fr] sm:px-8">
            <p>
              의안·회의 정보는 국회사무처{" "}
              <a className="underline decoration-rule underline-offset-2 hover:decoration-ink" href="https://open.assembly.go.kr" target="_blank" rel="noreferrer">
                열린국회정보
              </a>{" "}
              Open API를 <b className="font-semibold text-ink-2">하루 3회({CHECK_TIMES_KST.join(" · ")})</b> 조회해 자동으로 판정합니다. API 반영은 며칠 늦을 수 있어, 확인되지 않은 사항은 ‘확인 불확실’로 표시합니다. ‘추정’은 일반 절차에 근거한 예상이며 사실이 아닙니다.
            </p>
            <p>
              빠른 입법 지지 메모가 100개 모일 때마다 AI 비서 ‘피클(Pickle)’이 교육위원회 의원 지역사무실에 전화를 겁니다. 운영자 승인 후 평일 업무시간에만, 사무실당 한 번입니다. 이 사이트는 개인이 운영하는 시민 모니터로 국회·정부와 관계가 없습니다.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
