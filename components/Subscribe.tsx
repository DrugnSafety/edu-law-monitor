"use client";
import { useState } from "react";

export default function Subscribe({ emailConfigured }: { emailConfigured: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: fd.get("email"), website: fd.get("website") }) });
      const j = await res.json().catch(() => ({}));
      setMsg({ ok: res.ok, text: j.message || j.error || "요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요." });
      if (res.ok) form.reset();
    } catch {
      setMsg({ ok: false, text: "네트워크에 연결할 수 없습니다. 연결을 확인하고 다시 시도하세요." });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="sub-email" className="text-sm font-semibold">
        이메일 주소
      </label>
      <div className="flex gap-2">
        <input
          id="sub-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="name@example.com"
          className="min-w-0 flex-1 rounded-md border border-rule bg-sheet px-3 py-2.5 text-[15px] placeholder:text-ink-3/80 focus:border-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/80"
        />
        <button disabled={busy} className="shrink-0 rounded-md bg-ink px-4 py-2.5 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-[#0b1325] disabled:cursor-wait disabled:opacity-70">
          {busy ? "보내는 중…" : "알림 받기"}
        </button>
      </div>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <p aria-live="polite" className={`min-h-[1.25rem] text-sm font-medium ${msg?.ok ? "text-grid" : "text-seal-ink"}`}>
        {msg?.text}
      </p>
      <p className="text-[13px] leading-relaxed text-ink-3">
        판정이 ‘변화 있음’ 또는 ‘확인 불확실’일 때만 짧은 요약을 보냅니다. 확인 메일의 버튼을 눌러야 구독이 시작되고, 모든 메일에 한 번에 해지하는 링크가 있습니다.
        {!emailConfigured && " 지금은 메일 발송 설정 전이라, 신청은 받되 발송은 설정 후 시작합니다."}
      </p>
    </form>
  );
}
