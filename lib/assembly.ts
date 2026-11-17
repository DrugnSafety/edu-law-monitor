import { env } from "./config";

// 열린국회정보 Open API 클라이언트. 검증된 서비스 코드는 README 참고.
export const SERVICES = {
  memberBills: "nzmimeepazxkubdpn", // 국회의원 발의법률안(의원 발의만)
  billSearch: "TVBPMBILL11", // 의안 검색(위원장 대안 포함, PROPOSER_KIND/PASS_GUBUN)
  billInfo: "ALLBILL", // 의안정보 통합(소관위·법사위·본회의·이송·공포 일자), BILL_NO 필수
  billSummary: "BPMBILLSUMMARY", // 제안이유 및 주요내용, BILL_NO
  billMeetings: "VCONFBILLCONFLIST", // 의안 관련 회의록 목록, BILL_ID
  committeeSchedule: "nttmdfdcaakvibdar", // 위원회 전체회의 일정(ANGUN=안건)
  subcommitteeSchedule: "nrsldhjpaemrmolla", // 소위원회 일정(ANGUN=안건)
  plenarySchedule: "nekcaiymatialqlxr", // 본회의 일정(CONTS=의사일정)
  plenaryBills: "nwbpacrgavhjryiph", // 본회의 처리안건(법률안)
  committeeMembers: "nktulghcadyhmiqxi", // 위원회 위원 명단(ASSEM_TEL/ASSEM_EMAIL)
  members: "nwvrqwxyaytdsfvhu", // 국회의원 인적사항
} as const;

export class AssemblyApiError extends Error {}

type Row = Record<string, unknown>;

export async function assemblyQuery(
  service: string,
  params: Record<string, string>,
  opts: { pSize?: number; maxPages?: number; revalidate?: number } = {},
): Promise<{ rows: Row[]; total: number }> {
  const key = env("ASSEMBLY_API_KEY");
  if (!key) throw new AssemblyApiError("ASSEMBLY_API_KEY 미설정");
  const pSize = opts.pSize ?? 100;
  const maxPages = opts.maxPages ?? 1;
  const rows: Row[] = [];
  let total = 0;
  for (let p = 1; p <= maxPages; p++) {
    const u = new URL(`https://open.assembly.go.kr/portal/openapi/${service}`);
    u.searchParams.set("KEY", key);
    u.searchParams.set("Type", "json");
    u.searchParams.set("pIndex", String(p));
    u.searchParams.set("pSize", String(pSize));
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    let text = "";
    // 일시적 시간 초과·네트워크 오류는 1회 재시도(단발성 지연으로 '확인 불확실' 알림이 가지 않도록)
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await fetch(u, {
          headers: { "User-Agent": "Mozilla/5.0 (edu-law-monitor)", Accept: "application/json" },
          ...(opts.revalidate ? { next: { revalidate: opts.revalidate } } : { cache: "no-store" }),
          signal: AbortSignal.timeout(20000),
        } as RequestInit);
        text = await res.text();
        if (!res.ok) throw new AssemblyApiError(`${service} HTTP ${res.status}`);
        break;
      } catch (e) {
        const transient = !(e instanceof AssemblyApiError) || /HTTP 5\d\d/.test((e as Error).message);
        if (transient && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        // 키가 노출되지 않도록 URL은 메시지에 포함하지 않음
        throw new AssemblyApiError(`${service} 호출 실패: ${(e as Error).message}`);
      }
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AssemblyApiError(`${service} 응답 파싱 실패`);
    }
    const top = json[service] as Array<Record<string, unknown>> | undefined;
    if (!top) {
      const r = json.RESULT as { CODE?: string; MESSAGE?: string } | undefined;
      if (r?.CODE === "INFO-200") return { rows, total }; // 해당 데이터 없음
      throw new AssemblyApiError(`${service} 오류 ${r?.CODE ?? "?"}: ${r?.MESSAGE ?? "알 수 없음"}`);
    }
    const head = (top[0]?.head as Array<Record<string, unknown>>) || [];
    total = Number((head[0] as { list_total_count?: number })?.list_total_count ?? 0);
    const pageRows = ((top[1]?.row as Row[]) || []) as Row[];
    rows.push(...pageRows);
    if (rows.length >= total || pageRows.length < pSize) break;
  }
  return { rows, total };
}

export const s = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t ? t : null;
};

export function stripHtml(h: string | null | undefined): string {
  return (h || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[lr]squo;/g, "'")
    .trim();
}

export type CommitteeMember = {
  name: string;
  role: string;
  party: string;
  district: string;
  tel: string | null;
  email: string | null;
  room: string | null;
  committee: string;
  monaCd: string | null;
};

export async function fetchCommitteeMembers(committee: string, revalidate = 21600): Promise<CommitteeMember[]> {
  const { rows } = await assemblyQuery(SERVICES.committeeMembers, { DEPT_NM: committee }, { revalidate });
  const order = (r: string) => (r === "위원장" ? 0 : r === "간사" ? 1 : 2);
  return rows
    .map((r) => ({
      name: s(r.HG_NM) || "",
      role: s(r.JOB_RES_NM) || "위원",
      party: s(r.POLY_NM) || "",
      district: s(r.ORIG_NM) || "",
      tel: s(r.ASSEM_TEL),
      email: s(r.ASSEM_EMAIL),
      room: s(r.ROOM_NO),
      committee: s(r.DEPT_NM) || committee,
      monaCd: s(r.MONA_CD),
    }))
    .sort((a, b) => order(a.role) - order(b.role) || a.name.localeCompare(b.name, "ko"));
}
