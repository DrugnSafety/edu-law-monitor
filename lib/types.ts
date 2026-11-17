import type { Verdict } from "./config";

export type StageStatus = "done" | "in_progress" | "pending" | "unknown";
export type StageInfo = { n: number; label: string; status: StageStatus; date?: string | null; evidence?: string };

export type BillSnapshot = {
  billNo: string;
  law?: string;
  billId?: string;
  name: string;
  proposer: string;
  proposeDate?: string | null;
  committee?: string | null;
  committeeProcDate?: string | null;
  committeeResult?: string | null;
  judiciaryReferDate?: string | null;
  judiciaryProcDate?: string | null;
  judiciaryResult?: string | null;
  plenaryDate?: string | null;
  plenaryResult?: string | null;
  transferDate?: string | null;
  promulgationDate?: string | null;
  promulgationNo?: string | null;
  passGubun?: string | null;
  procResult?: string | null;
  link?: string | null;
  found: boolean;
};

export type AlternativeInfo = BillSnapshot & {
  law: string;
  summary?: string | null;
  contentCheck?: { age12: boolean | null; grade6: boolean | null; removesLongTerm: boolean | null };
};

export type Meeting = {
  key: string;
  date: string;
  time?: string | null;
  body: "교육위 전체회의" | "교육위 소위" | "법사위 전체회의" | "본회의";
  title: string;
  session?: string | null;
  link?: string | null;
  agendaAvailable: boolean;
  relevant: boolean | null; // null = 안건 확인 불가
  matchedItems: string[];
  otherItems?: string[]; // 다른 교육공무원법/사립학교법 개정안, 또는 '소위 심사보고' 등 포함 여부 불명확 항목
  when: "past" | "today" | "upcoming";
};

export type SourceStatus = { name: string; ok: boolean; detail: string; rows?: number };

export type NewsItem = {
  id: string; // link hash
  createdAt: string;
  kind: "news" | "blog" | "cafearticle";
  title: string;
  link: string;
  source?: string;
  pubDate?: string | null; // YYYY-MM-DD or ISO
  description: string;
  summary: string;
  query: string;
  strong?: boolean; // 이 법안 맥락(12세·초6·대안·국회 심사)까지 언급 — 판정 근거로 사용
};

export type EventKind = "baseline" | "stage" | "alternative" | "meeting" | "news" | "uncertain" | "content" | "lag" | "call";
export type MonitorEvent = {
  id: string;
  createdAt: string;
  runId: string;
  kind: EventKind;
  title: string;
  detail?: string;
  sources?: { label: string; url: string }[];
  date?: string | null; // 사건 발생일(알 수 있으면)
};

export type MonitorRun = {
  id: string;
  createdAt: string;
  kstDate: string;
  trigger: "cron" | "admin" | "cli";
  verdict: Verdict;
  headline: string;
  reasons: string[]; // 판정 근거
  uncertainties: string[];
  notes: string[]; // 최신성 의심 등
  stage: number; // 완료된 최고 단계
  stages: StageInfo[];
  baselineBills: BillSnapshot[];
  alternatives: AlternativeInfo[];
  meetings: Meeting[];
  sources: SourceStatus[];
  outlook: { text: string; generatedBy: "llm" | "rule" };
  newsNew: number;
  durationMs: number;
};

export type Post = {
  id: string;
  createdAt: string;
  nickname: string;
  stance: "support" | "other";
  body: string;
  hidden: boolean;
  ipHash: string;
};

export type Subscriber = {
  id: string; // email lowercased hash
  createdAt: string;
  email: string;
  status: "pending" | "confirmed" | "unsubscribed";
  token: string;
  confirmedAt?: string;
};

export type PacketTarget = {
  name: string;
  office: string;
  phone: string;
  sourceUrl: string;
  verified: boolean;
  sourceVerified?: boolean;
  sms?: string | null;
  alternates?: string[]; // 같은 의원의 다른 지역사무실 번호(부재 시 재시도용)
};

export type CallOutcome = "통화완료" | "부재" | "거절";
export type CallResult = { id: string; name: string; office: string; outcome: CallOutcome; memo: string; recordedAt: string };

export type PacketDispatch = {
  status: "sent" | "failed";
  mode: "approval" | "auto";
  at: string;
  messageIds: number[];
  error?: string;
};
export type ActionPacket = {
  id: string;
  createdAt: string;
  milestone: number;
  supportCount: number;
  memos: { nickname: string; body: string }[];
  callScript: string;
  smsText: string;
  targets: PacketTarget[];
  smsTargets: PacketTarget[];
  status: "queued" | "approved" | "done" | "skipped";
  note?: string;
  updatedAt?: string;
  targetsFallback?: boolean; // 출처 확인 번호가 없어 전체 후보를 보낸 경우
  dispatchedAt?: string | null; // 텔레그램 발송 성공 시각
  telegramMessageId?: number | null; // 첫 메시지 id(결과 답장 기준)
  dispatches?: PacketDispatch[]; // 발송 시도 이력(다시 보내기 포함)
  callResults?: CallResult[];
};
