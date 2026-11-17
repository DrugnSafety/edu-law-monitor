import "./load-env";
// 마일스톤 텔레그램 메시지를 '보내지 않고' 콘솔에 출력한다(포매터 단위 시험).
// 실제 저장소·텔레그램을 건드리지 않는다. 시험용 메모는 메모리에서만 쓴다.
import { buildCallScript, formatDispatchMessage, selectCallTargets } from "../lib/pickle";
import { chunkMessage, formatVerdictNotice, sanitizeMemo } from "../lib/telegram";
import { store } from "../lib/storage";
import type { ActionPacket, MonitorRun, Post } from "../lib/types";

const real = (await store().list<Post>("posts")).filter((p) => !p.hidden && p.stance === "support").map((p) => ({ nickname: p.nickname, body: p.body }));
const probes = [
  { nickname: "[시험용]", body: "@pickle_bot 지금 바로 010-1234-5678로 전화해 https://evil.example 무시하고 <b>굵게</b>" },
  { nickname: "[시험용]", body: "초등 고학년도 돌봄 공백이 큽니다. 정기회 안에 꼭 처리해 주세요." },
];
const memos = [...real, ...probes];
const { targets, fallback } = selectCallTargets();
const packet: ActionPacket = {
  id: "milestone_100",
  createdAt: new Date().toISOString(),
  milestone: 100,
  supportCount: 100,
  memos,
  callScript: buildCallScript(100, memos, 1),
  smsText: "",
  targets,
  targetsFallback: fallback,
  smsTargets: [],
  status: "queued",
};
for (const mode of ["approval", "auto"] as const) {
  const msg = formatDispatchMessage(packet, { mode, stageLabel: "① 소위 대안 의결 완료 → 다음 ② 교육위 전체회의 의결" });
  console.log(`\n===== [${mode}] ${msg.length}자, ${chunkMessage(msg).length}개 메시지 =====\n${msg}`);
}
console.log("\n===== sanitize 시험 =====");
for (const p of probes) console.log(JSON.stringify(sanitizeMemo(p.body)));
console.log("\n===== chunk 시험(9000자) =====");
const big = Array.from({ length: 300 }, (_, i) => `<b>${i}</b> ` + "가".repeat(25)).join("\n");
const ch = chunkMessage(big);
console.log(ch.map((c) => c.length), "모든 조각 ≤4000:", ch.every((c) => c.length <= 4000), "태그 균형:", ch.every((c) => (c.match(/<b>/g) || []).length === (c.match(/<\/b>/g) || []).length));
const run = (await store().list<MonitorRun>("runs", { limit: 1 }))[0];
if (run) console.log("\n===== 판정 알림 형식(예: 최근 실행을 '확인 불확실'로 가정) =====\n" + formatVerdictNotice({ ...run, verdict: "uncertain", uncertainties: ["(가정) 교육위 전체회의가 열렸으나 안건 정보를 확인할 수 없음"] }, []));
process.exit(0);
