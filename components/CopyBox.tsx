"use client";
import { useState } from "react";

export default function CopyBox({ title, text }: { title: string; text: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <div className="rounded-md border border-rule bg-sheet">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-ink/20 px-2.5 py-1 text-[13px] font-semibold text-ink transition-colors duration-150 hover:border-ink"
          aria-label={`${title} 복사`}
        >
          {state === "done" ? "복사함" : "복사"}
        </button>
      </div>
      <p className="ruled whitespace-pre-wrap px-4 py-1 font-serif text-[15px] text-ink">{text}</p>
      <p aria-live="polite" className="sr-only">
        {state === "done" ? `${title}을 복사했습니다.` : state === "fail" ? "복사하지 못했습니다. 글을 직접 선택해 복사하세요." : ""}
      </p>
    </div>
  );
}
