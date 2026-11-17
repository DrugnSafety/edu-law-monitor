"use client";
import { useState } from "react";

export default function Subscribe({ emailConfigured }: { emailConfigured: boolean }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, website }) });
      const j = await res.json();
      setMsg({ ok: res.ok, text: j.message || j.error });
      if (res.ok) setEmail("");
    } catch {
      setMsg({ ok: false, text: "네트워크 오류" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일 주소" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none" />
        <button disabled={busy} className="rounded-lg bg-civic-600 px-4 py-2 text-sm font-bold text-white hover:bg-civic-700 disabled:opacity-60">구독</button>
      </div>
      <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px] h-0 w-0" />
      <p className="text-[11px] text-slate-500">
        &lsquo;변화 있음&rsquo; 또는 &lsquo;확인 불확실&rsquo;일 때만 요약을 보냅니다. 확인 메일의 링크를 눌러야 구독이 완료되며, 모든 메일에 해지 링크가 있습니다.
        {!emailConfigured && " (현재 메일 발송 미설정 — 운영자 확인 후 활성화)"}
      </p>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
    </form>
  );
}
