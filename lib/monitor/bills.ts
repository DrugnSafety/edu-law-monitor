import { assemblyQuery, s, SERVICES } from "../assembly";
import { ASSEMBLY_AGE, BASELINE_BILLS, BASELINE_DATE, TARGET_LAWS } from "../config";
import type { AlternativeInfo, BillSnapshot, SourceStatus } from "../types";

function fromAllBill(billNo: string, r: Record<string, unknown> | undefined): BillSnapshot {
  if (!r) return { billNo, name: "", proposer: "", found: false };
  return {
    billNo,
    billId: s(r.BILL_ID) || undefined,
    name: s(r.BILL_NM) || "",
    proposer: s(r.PPSR_NM) || "",
    proposeDate: s(r.PPSL_DT),
    committee: s(r.JRCMIT_NM),
    committeeProcDate: s(r.JRCMIT_PROC_DT),
    committeeResult: s(r.JRCMIT_PROC_RSLT),
    judiciaryReferDate: s(r.LAW_CMMT_DT),
    judiciaryProcDate: s(r.LAW_PROC_DT),
    judiciaryResult: s(r.LAW_PROC_RSLT),
    plenaryDate: s(r.RGS_RSLN_DT),
    plenaryResult: s(r.RGS_CONF_RSLT),
    transferDate: s(r.GVRN_TRSF_DT),
    promulgationDate: s(r.PROM_DT),
    promulgationNo: s(r.PROM_NO),
    link: s(r.LINK_URL),
    found: true,
  };
}

export async function fetchBill(billNo: string): Promise<BillSnapshot> {
  const { rows } = await assemblyQuery(SERVICES.billInfo, { BILL_NO: billNo }, { pSize: 5 });
  return fromAllBill(billNo, rows[0]);
}

export async function fetchBaselineBills(sources: SourceStatus[]): Promise<BillSnapshot[]> {
  const out: BillSnapshot[] = [];
  let ok = 0;
  const errors: string[] = [];
  // 의안 검색(TVBPMBILL11)의 PASS_GUBUN/PROC_RESULT_CD를 보조로 사용
  const searchByNo = new Map<string, Record<string, unknown>>();
  for (const law of TARGET_LAWS) {
    try {
      const { rows } = await assemblyQuery(SERVICES.billSearch, { AGE: ASSEMBLY_AGE, BILL_NAME: law }, { maxPages: 3 });
      for (const r of rows) searchByNo.set(String(r.BILL_NO), r);
    } catch {
      /* 보조 소스 — 실패해도 ALLBILL로 판단 */
    }
  }
  for (const b of BASELINE_BILLS) {
    try {
      const snap = await fetchBill(b.billNo);
      snap.law = b.law;
      const sr = searchByNo.get(b.billNo);
      if (sr) {
        snap.passGubun = s(sr.PASS_GUBUN);
        snap.procResult = s(sr.PROC_RESULT_CD);
        snap.committeeResult ||= s(sr.CMT_PROC_RESULT_CD);
        snap.committeeProcDate ||= s(sr.CMT_PROC_DT);
      }
      out.push(snap);
      if (snap.found) ok++;
    } catch (e) {
      errors.push(`${b.billNo}: ${(e as Error).message}`);
      out.push({ billNo: b.billNo, law: b.law, name: `${b.law} 일부개정법률안`, proposer: b.proposer, found: false });
    }
  }
  sources.push({
    name: `의안정보 통합(${SERVICES.billInfo}) — 기준선 ${BASELINE_BILLS.length}건`,
    ok: errors.length === 0 && ok === BASELINE_BILLS.length,
    detail: errors.length ? errors.join("; ") : `${ok}/${BASELINE_BILLS.length}건 조회`,
    rows: ok,
  });
  return out;
}

const KNOWN_OLD_ALTERNATIVES = new Set(["2217882"]); // 2026-03 교육공무원법(대안) — 겸직·연수휴직, 무관

// 위원장 대안 자동 탐지: 의안 검색(TVBPMBILL11)에서 교육위원장 제안 + (대안) + 기준일 이후
export async function findAlternatives(sources: SourceStatus[]): Promise<AlternativeInfo[]> {
  const found: AlternativeInfo[] = [];
  const errs: string[] = [];
  let scanned = 0;
  for (const law of TARGET_LAWS) {
    try {
      const { rows } = await assemblyQuery(SERVICES.billSearch, { AGE: ASSEMBLY_AGE, BILL_NAME: law }, { maxPages: 3 });
      scanned += rows.length;
      for (const r of rows) {
        const no = String(r.BILL_NO);
        const name = s(r.BILL_NAME) || "";
        const proposer = s(r.PROPOSER) || "";
        const kind = s(r.PROPOSER_KIND) || "";
        const isAlt = name.includes("(대안)") || kind === "위원장" || proposer.includes("위원장");
        if (!isAlt || KNOWN_OLD_ALTERNATIVES.has(no)) continue;
        if (!proposer.includes("교육위원장") && !proposer.includes("교육위원회")) continue;
        const pd = s(r.PROPOSE_DT);
        const cd = s(r.CMT_PROC_DT);
        if (!((pd && pd >= BASELINE_DATE) || (cd && cd >= BASELINE_DATE))) continue;
        let snap: BillSnapshot;
        try {
          snap = await fetchBill(no);
        } catch {
          snap = { billNo: no, name, proposer, proposeDate: pd, link: s(r.LINK_URL), found: true };
        }
        if (!snap.found) snap = { billNo: no, name, proposer, proposeDate: pd, link: s(r.LINK_URL), found: true };
        snap.passGubun = s(r.PASS_GUBUN);
        snap.procResult = s(r.PROC_RESULT_CD);
        let summary: string | null = null;
        try {
          const sm = await assemblyQuery(SERVICES.billSummary, { BILL_NO: no }, { pSize: 5 });
          summary = s(sm.rows[0]?.SUMMARY);
        } catch {
          summary = null;
        }
        const has = (re: RegExp) => (summary ? re.test(summary) : null);
        found.push({
          ...snap,
          law,
          summary,
          contentCheck: {
            age12: has(/(만\s*)?12세/),
            grade6: has(/초등학교\s*6학년/),
            removesLongTerm: has(/장기간/),
          },
        });
      }
    } catch (e) {
      errs.push(`${law}: ${(e as Error).message}`);
    }
  }
  sources.push({
    name: `의안 검색(${SERVICES.billSearch}) — 위원장 대안 탐지`,
    ok: errs.length === 0,
    detail: errs.length ? errs.join("; ") : `${scanned}건 검사, 기준일 이후 위원장 대안 ${found.length}건`,
    rows: scanned,
  });
  return found;
}
