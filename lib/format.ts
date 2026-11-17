// 서버·브라우저 어디서 렌더링해도 같은 결과가 나오도록 시간대를 KST로 고정(하이드레이션 불일치 방지)
const TZ = "Asia/Seoul";

const dtf = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const df = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, year: "numeric", month: "long", day: "numeric", weekday: "short" });
const mdw = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short" });
const nf = new Intl.NumberFormat("ko-KR");

/** "11. 18. 14:05" 형태 */
export function fmtDateTime(iso: string): string {
  return dtf.format(new Date(iso));
}
/** "2026년 11월 18일 (수)" */
export function fmtLongDate(ymdOrIso: string): string {
  const d = ymdOrIso.length === 10 ? new Date(ymdOrIso + "T12:00:00+09:00") : new Date(ymdOrIso);
  return df.format(d);
}
/** YYYY-MM-DD → { md: "11.17", wd: "화" } */
export function splitYmd(ymd: string): { md: string; wd: string } {
  const d = new Date(ymd + "T12:00:00+09:00");
  const parts = mdw.formatToParts(d);
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
  return { md: `${m}.${day}`, wd };
}
export function fmtNum(n: number): string {
  return nf.format(n);
}
