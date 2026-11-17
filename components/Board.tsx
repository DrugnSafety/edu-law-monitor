"use client";
import { useState } from "react";

type Post = { id: string; createdAt: string; nickname: string; stance: "support" | "other"; body: string };
type Stats = { total: number; support: number; other: number; nextMilestone: number; progress: number };

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export default function Board({ initialPosts, initialStats }: { initialPosts: Post[]; initialStats: Stats }) {
  const [posts, setPosts] = useState(initialPosts);
  const [stats, setStats] = useState(initialStats);
  const [nickname, setNickname] = useState("");
  const [stance, setStance] = useState<"support" | "other">("support");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "support" | "other">("all");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setMsg({ ok: false, text: "내용을 입력해 주세요." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nickname, stance, body, website }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "등록 실패");
      setPosts((p) => [j.post, ...p]);
      setStats(j.stats);
      setBody("");
      setMsg({ ok: true, text: j.milestone ? `등록되었습니다. 지지 ${j.milestone}개 달성! 운영자가 교육위원실 전달을 준비합니다.` : "등록되었습니다. 응원 감사합니다!" });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const prev = stats.nextMilestone - 100;
  const pct = Math.round(((stats.support - prev) / 100) * 100);
  const shown = posts.filter((p) => filter === "all" || p.stance === filter);

  return (
    <div>
      <div className="rounded-lg bg-civic-50 p-4">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-civic-700">빠른 입법 지지</p>
            <p className="text-3xl font-extrabold tabular-nums text-civic-900">
              {stats.support.toLocaleString()}
              <span className="ml-1 text-base font-semibold text-slate-500">개</span>
            </p>
          </div>
          <p className="text-right text-xs text-slate-600">
            다음 목표 <b className="text-civic-800">{stats.nextMilestone}</b>까지 <b className="text-civic-800">{stats.nextMilestone - stats.support}</b>개
            <br />
            기타 의견 {stats.other.toLocaleString()}개
          </p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white ring-1 ring-civic-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-civic-600 transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-500">지지 메모가 100개 모일 때마다 대표 메모를 정리해 교육위원 의원실에 정중히 전달합니다(운영자가 직접 확인 후 진행, 자동 발신 없음).</p>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div className="flex gap-2" role="radiogroup" aria-label="입장">
          {(
            [
              ["support", "빠른 입법 지지"],
              ["other", "기타 의견"],
            ] as const
          ).map(([v, l]) => (
            <button
              type="button"
              key={v}
              role="radio"
              aria-checked={stance === v}
              onClick={() => setStance(v)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${stance === v ? "border-civic-600 bg-civic-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} placeholder="닉네임(선택, 비우면 익명)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none" />
        <div className="relative">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 200))}
            rows={3}
            maxLength={200}
            placeholder={stance === "support" ? "예) 초등 고학년도 돌봄이 필요합니다. 이번 정기회에 꼭 통과시켜 주세요." : "의견을 한 줄로 남겨 주세요."}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-civic-600 focus:outline-none"
          />
          <span className="absolute bottom-2 right-3 text-[11px] text-slate-400">{body.length}/200</span>
        </div>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>
            웹사이트
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
        </div>
        <button disabled={busy} className="w-full rounded-lg bg-civic-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-civic-900 disabled:opacity-60">
          {busy ? "등록 중…" : "응원 남기기"}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
        <p className="text-[11px] text-slate-500">개인정보(전화번호·주소 등)는 적지 마세요. 링크·욕설·비방은 숨김 처리될 수 있습니다.</p>
      </form>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-bold text-civic-900">응원 메모 {stats.total.toLocaleString()}개</h3>
        <div className="flex gap-1 text-xs">
          {(
            [
              ["all", "전체"],
              ["support", "지지"],
              ["other", "기타"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`rounded-md px-2 py-1 ${filter === v ? "bg-civic-100 font-semibold text-civic-800" : "text-slate-500"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">아직 메모가 없습니다. 첫 응원을 남겨 주세요!</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {shown.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex items-center gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 font-semibold ${p.stance === "support" ? "bg-civic-50 text-civic-700" : "bg-slate-100 text-slate-600"}`}>{p.stance === "support" ? "지지" : "의견"}</span>
                <span className="font-semibold text-slate-700">{p.nickname}</span>
                <span className="text-slate-400">{ago(p.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{p.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
