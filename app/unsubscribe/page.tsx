import { Suspense } from "react";
import UnsubscribeClient from "@/components/UnsubscribeClient";

export const metadata = { title: "구독 해지 · 교원 육아휴직 12세 입법 모니터", robots: { index: false, follow: false } };

export default function UnsubscribePage() {
  return (
    <div className="mx-auto max-w-lg pt-16">
      <h1 className="font-serif text-[30px] font-bold">구독 해지</h1>
      <Suspense fallback={<p className="mt-4 text-ink-2">해지하는 중…</p>}>
        <UnsubscribeClient />
      </Suspense>
    </div>
  );
}
