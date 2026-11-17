// 모니터링 기준선과 상수. 기준선은 docs/original-monitoring-prompt-v3.md 및 PLAN.md 기준.

export const BASELINE_DATE = "2026-11-17";
export const SESSION_END = "2026-12-09"; // 정기회 종료일
export const ASSEMBLY_AGE = "22";
export const ASSEMBLY_UNIT_CD = "100022";

export type BaselineBill = {
  billNo: string;
  law: "교육공무원법" | "사립학교법";
  proposer: string;
  note?: string;
};

// 2026-11-17 제439회 제1차 교육위원회 법안심사소위원회에서 모두 "대안반영폐기" 의결(기준선)
export const BASELINE_BILLS: BaselineBill[] = [
  { billNo: "2200804", law: "교육공무원법", proposer: "김선교의원" },
  { billNo: "2200971", law: "교육공무원법", proposer: "한정애의원" },
  { billNo: "2216190", law: "교육공무원법", proposer: "위성곤의원", note: "만 12세·초6 확대(안 제44조)" },
  { billNo: "2221830", law: "교육공무원법", proposer: "김희정의원", note: "만 12세·초6 확대 + 난임휴직 '장기간' 삭제" },
  { billNo: "2200968", law: "사립학교법", proposer: "한정애의원" },
  { billNo: "2217235", law: "사립학교법", proposer: "서영교의원" },
  { billNo: "2222256", law: "사립학교법", proposer: "강경숙의원" },
];

export const TARGET_LAWS = ["교육공무원법", "사립학교법"] as const;

export const STAGES = [
  { n: 1, key: "subcommittee", label: "소위 대안 의결", short: "소위" },
  { n: 2, key: "committee", label: "교육위 전체회의 의결", short: "교육위" },
  { n: 3, key: "judiciary", label: "법사위 체계·자구 심사", short: "법사위" },
  { n: 4, key: "plenary", label: "본회의 의결", short: "본회의" },
  { n: 5, key: "transfer", label: "정부 이송", short: "이송" },
  { n: 6, key: "promulgation", label: "공포", short: "공포" },
  { n: 7, key: "enforcement", label: "시행", short: "시행" },
] as const;

export const VERDICTS = {
  changed: { label: "변화 있음", tone: "red" },
  uncertain: { label: "확인 불확실", tone: "amber" },
  none: { label: "변화 없음(확인 완료)", tone: "green" },
} as const;
export type Verdict = keyof typeof VERDICTS;

export const NEWS_QUERIES = [
  "교원 육아휴직 12세",
  "교원 육아휴직 초6",
  "교육공무원법 대안",
  "교육공무원법 육아휴직",
  "사립학교법 육아휴직 교원",
];

// 사용자가 직접 확인할 수 있는 링크(자동 수집 대상 아님)
export const MANUAL_CHECK_LINKS = [
  { label: "교육위원회 회의자료", url: "https://edu.na.go.kr" },
  { label: "국회 의안 검색", url: "https://www.assembly.go.kr/portal/signl/search/search.do" },
  { label: "국회입법현황(국민참여입법센터)", url: "https://opinion.lawmaking.go.kr/gcom/nsmLmSts/out/2216190/detailRP" },
];

export const MILESTONE_STEP = 100;

// 하루 3회 확인(KST). vercel.json crons(UTC)와 함께 바꿀 것.
// 08:40 밤사이 API 동기화 + 오늘 공지된 의사일정(회의는 보통 10:00·14:00)
// 13:40 오전 회의 결과 + 오후 일정 / 21:10 하루 결과 + 다음 날 일정
export const CHECK_TIMES_KST = ["08:40", "13:40", "21:10"] as const;

export type DispatchMode = "approval" | "auto";
export function pickleDispatchMode(): DispatchMode {
  return env("PICKLE_DISPATCH_MODE") === "auto" ? "auto" : "approval";
}

export function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export function siteUrl(): string {
  return (env("SITE_URL") || (env("VERCEL_URL") ? `https://${env("VERCEL_URL")}` : "http://localhost:3210")).replace(/\/$/, "");
}

export function featureFlags() {
  return {
    assembly: !!env("ASSEMBLY_API_KEY"),
    naver: !!(env("NAVER_CLIENT_ID") && env("NAVER_CLIENT_SECRET")),
    llm: !!env("ANTHROPIC_API_KEY"),
    email: !!(env("SMTP_USER") && env("SMTP_PASS")) || !!env("RESEND_API_KEY"),
    telegram: !!(env("TELEGRAM_BOT_TOKEN") && env("TELEGRAM_CHAT_ID")),
    postgres: !!env("DATABASE_URL"),
    admin: !!env("ADMIN_TOKEN"),
    cron: !!env("CRON_SECRET"),
  };
}

// KST 기준 날짜 유틸
export function kstNow(d = new Date()): Date {
  return new Date(d.getTime() + 9 * 3600 * 1000);
}
export function kstDate(d = new Date()): string {
  return kstNow(d).toISOString().slice(0, 10);
}
export function addDays(ymd: string, n: number): string {
  const t = new Date(ymd + "T00:00:00Z").getTime() + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 86400000);
}
export function fmtKst(iso: string): string {
  const k = kstNow(new Date(iso));
  return `${k.toISOString().slice(0, 10)} ${k.toISOString().slice(11, 16)} KST`;
}
