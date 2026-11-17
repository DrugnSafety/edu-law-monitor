import "./load-env";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fetchCommitteeMembers, SERVICES } from "../lib/assembly";

// 열린국회정보 '위원회 위원 명단'의 ASSEM_TEL에 공식 게재된 지역사무실 번호만 후보로 추가한다.
// 기존 항목의 verified 값과 수동 추가 항목은 보존한다. 개인 휴대전화는 수집하지 않는다.
type Entry = { name: string; office: string; phone: string; sourceUrl: string; verified: boolean; sms?: string | null; note?: string };
const file = "data/office-phones.json";
const cur: { updatedAt?: string; note?: string; entries: Entry[] } = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : { entries: [] };
const members = await fetchCommitteeMembers("교육위원회", 0);
const SRC = `https://open.assembly.go.kr/portal/openapi/${SERVICES.committeeMembers} (열린국회정보 위원회 위원 명단 ASSEM_TEL)`;
let added = 0;
for (const m of members) {
  const tel = m.tel || "";
  // 예: "02-784-6960 (대전: 042-485-4413)", "02-784-8630(국회) 053-476-9563(지역)"
  const re = /\(?\s*([가-힣]+)?\s*:?\s*(0(?!2-784)\d{1,2}-\d{3,4}-\d{4})\s*\)?\s*(\(([^)]*)\))?/g;
  for (const mm of tel.matchAll(re)) {
    const phone = mm[2];
    if (phone.startsWith("010")) continue; // 휴대전화 제외
    if (cur.entries.some((e) => e.name === m.name && e.phone === phone)) continue;
    cur.entries.push({ name: m.name, office: `지역사무실${mm[1] ? `(${mm[1]})` : mm[4] ? `(${mm[4]})` : ""} — ${m.district}`, phone, sourceUrl: SRC, verified: false, sms: null });
    added++;
  }
}
cur.updatedAt = new Date().toISOString();
writeFileSync(file, JSON.stringify(cur, null, 2) + "\n");
console.log(`교육위원 ${members.length}명 검사, 신규 지역사무실 번호 ${added}건 추가 (총 ${cur.entries.length}건, 모두 수동 검증 필요)`);
