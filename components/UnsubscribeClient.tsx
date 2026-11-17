"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// 브라우저에서 열면 한 번에 해지(POST). 메일 스캐너는 보통 스크립트를 실행하지 않아 해지되지 않는다.
export default function UnsubscribeClient() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<"working" | "done" | "invalid" | "error">(token ? "working" : "invalid");
  useEffect(() => {
    if (!token) return;
    fetch(`/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST", body: "List-Unsubscribe=One-Click", headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then((r) => setState(r.ok ? "done" : r.status === 400 ? "invalid" : "error"))
      .catch(() => setState("error"));
  }, [token]);
  return (
    <div aria-live="polite" className="mt-4 space-y-4 text-[16px] leading-relaxed text-ink-2">
      {state === "working" && <p>해지하는 중…</p>}
      {state === "done" && <p className="font-semibold text-grid">구독을 해지했습니다. 더 이상 메일을 보내지 않습니다.</p>}
      {state === "invalid" && <p className="text-seal-ink">해지 링크가 올바르지 않습니다. 받은 메일의 해지 링크를 다시 눌러 주세요.</p>}
      {state === "error" && (
        <form method="post" action={`/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`}>
          <p className="text-seal-ink">해지 요청을 보내지 못했습니다. 아래 버튼으로 다시 시도하세요.</p>
          <input type="hidden" name="confirm" value="1" />
          <button className="mt-3 rounded-md bg-ink px-4 py-2.5 font-bold text-white hover:bg-[#0b1325]">구독 해지하기</button>
        </form>
      )}
      <noscript>
        <form method="post" action={`/api/subscribe/unsubscribe?token=${encodeURIComponent(token)}`}>
          <input type="hidden" name="confirm" value="1" />
          <button className="rounded-md bg-ink px-4 py-2.5 font-bold text-white">구독 해지하기</button>
        </form>
      </noscript>
      <p>
        <Link href="/" className="font-semibold text-ink underline decoration-grid/50 underline-offset-[3px] hover:decoration-ink">
          첫 화면으로
        </Link>
      </p>
    </div>
  );
}
