"use client";
import { useState } from "react";

export default function CopyBox({ title, text }: { title: string; text: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-civic-700 ring-1 ring-civic-100"
        >
          {done ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="whitespace-pre-wrap px-3 py-2 text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}
