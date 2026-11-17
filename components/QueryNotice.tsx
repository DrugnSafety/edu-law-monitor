"use client";
import { useSearchParams } from "next/navigation";
import { Notice } from "./ui";

// 구독 확인·해지 후 돌아온 경우의 안내. 페이지를 정적(ISR)으로 두기 위해 브라우저에서 읽는다.
export default function QueryNotice() {
  const sp = useSearchParams();
  const sub = sp.get("subscribed");
  const unsub = sp.get("unsubscribed");
  if (sub === "1") return <Notice tone="ok">구독을 시작했습니다. 변화가 생기면 메일로 알려 드립니다.</Notice>;
  if (sub === "0") return <Notice tone="error">구독 확인 링크가 만료됐거나 올바르지 않습니다. 아래에서 다시 신청하세요.</Notice>;
  if (unsub === "1") return <Notice tone="ok">구독을 해지했습니다. 더 이상 메일을 보내지 않습니다.</Notice>;
  if (unsub === "0") return <Notice tone="error">해지 링크가 올바르지 않습니다. 받은 메일의 해지 링크를 다시 눌러 주세요.</Notice>;
  return null;
}
