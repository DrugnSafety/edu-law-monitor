import { STAGES, VERDICTS } from "./config";
import type { MonitorEvent, MonitorRun, StageInfo } from "./types";
import { escapeHtml as h } from "./util";

// 이메일용 HTML/텍스트 템플릿. 표 레이아웃 + 인라인 스타일만 사용(메일 클라이언트 호환).
const C = {
  paper: "#F3F5EF",
  sheet: "#FFFFFF",
  ink: "#16213A",
  ink2: "#46516A",
  ink3: "#5F687C",
  rule: "#C9D8CC",
  green: "#36704F",
  marker: "#FFE15A",
  red: "#C3352B",
  amber: "#8A5A00",
  amberBg: "#FFF4D1",
};
const SERIF = "'Gowun Batang','Nanum Myeongjo','AppleMyungjo','Batang',serif";
const SANS = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic',sans-serif";
const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦"];

export type MailContent = { subject: string; html: string; text: string };

export function shortHeadline(headline: string): string {
  const s = headline.replace(/^\[[^\]]+\]\s*/, "").trim();
  return s.length > 60 ? s.slice(0, 59) + "…" : s;
}

function shell(preheader: string, inner: string): string {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>교원 육아휴직 12세 입법 모니터</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};">${h(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${C.sheet};border:1px solid ${C.rule};border-radius:8px;">
<tr><td style="padding:20px 24px 14px 24px;border-bottom:1px solid ${C.rule};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="28" height="28" align="center" valign="middle" style="width:28px;height:28px;background:${C.red};color:#FFFFFF;font-family:${SERIF};font-size:14px;font-weight:bold;line-height:28px;border-radius:3px;">12</td>
<td style="padding-left:10px;font-family:${SERIF};font-size:17px;font-weight:bold;color:${C.ink};">교원 육아휴직 12세 입법 모니터</td>
</tr></table></td></tr>
${inner}
</table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.ink};border-radius:6px;"><a href="${h(href)}" style="display:inline-block;padding:12px 22px;font-family:${SANS};font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:6px;">${h(label)}</a></td></tr></table>`;
}

function sectionLabel(label: string): string {
  return `<div style="font-family:${SANS};font-size:12px;font-weight:bold;letter-spacing:1px;color:${C.green};padding-bottom:8px;">${h(label)}</div>`;
}

export function confirmMail(link: string): MailContent {
  const html = shell(
    "구독 확인 링크가 들어 있습니다.",
    `<tr><td style="padding:24px;font-family:${SANS};font-size:15px;line-height:1.7;color:${C.ink};">
<p style="margin:0 0 12px 0;font-family:${SERIF};font-size:20px;font-weight:bold;">구독을 확인해 주세요</p>
<p style="margin:0 0 20px 0;color:${C.ink2};">교원 육아휴직 12세 확대 입법 모니터의 변동 알림 구독을 요청하셨습니다. 아래 버튼을 눌러야 구독이 완료됩니다. 알림은 입법 단계에 변화가 있거나 확인이 필요할 때만 보냅니다.</p>
${button(link, "구독 확인하기")}
<p style="margin:20px 0 0 0;font-size:13px;color:${C.ink3};">본인이 요청하지 않았다면 이 메일을 무시하세요. 확인하지 않으면 메일을 보내지 않습니다.</p>
<p style="margin:12px 0 0 0;font-size:12px;color:${C.ink3};word-break:break-all;">버튼이 열리지 않으면 이 주소를 브라우저에 붙여넣으세요: ${h(link)}</p>
</td></tr>`,
  );
  const text = `구독을 확인해 주세요\n\n교원 육아휴직 12세 확대 입법 모니터의 변동 알림 구독을 요청하셨습니다.\n아래 링크를 열어야 구독이 완료됩니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하세요. 확인하지 않으면 메일을 보내지 않습니다.`;
  return { subject: "[교원 육아휴직 입법 모니터] 구독 확인", html, text };
}

function pill(verdict: MonitorRun["verdict"]): string {
  const label = VERDICTS[verdict].label;
  const [bg, fg] = verdict === "changed" ? [C.red, "#FFFFFF"] : verdict === "uncertain" ? [C.amberBg, C.amber] : [C.green, "#FFFFFF"];
  const border = verdict === "uncertain" ? `border:1px solid ${C.amber};` : "";
  return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${bg};color:${fg};${border}font-family:${SANS};font-size:13px;font-weight:bold;">${h(label)}</span>`;
}

function fmtDate(d?: string | null): string {
  const m = d?.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${+m[1]}/${+m[2]}` : "";
}

function stageCell(s: StageInfo | undefined, i: number): string {
  const short = STAGES[i].short;
  const label = `<div style="font-family:${SANS};font-size:10px;color:${C.green};padding:4px 0;border-bottom:1px solid ${C.rule};background:#F7FAF6;">${CIRCLED[i]} ${h(short)}</div>`;
  let body: string;
  if (s?.status === "done") {
    const d = fmtDate(s.date);
    body = `<span style="color:${C.red};font-weight:bold;font-size:${d ? "11px" : "16px"};">${d ? `<span style="display:inline-block;border:1px solid ${C.red};border-radius:10px;padding:1px 4px;">${h(d)}</span>` : "●"}</span>`;
  } else if (s?.status === "in_progress") {
    body = `<span style="display:inline-block;border:1px dashed ${C.ink2};border-radius:3px;padding:1px 4px;font-size:11px;color:${C.ink2};">다음</span>`;
  } else {
    body = `<span style="color:${C.rule};">&nbsp;</span>`;
  }
  return `<td align="center" valign="top" width="14%" style="border:1px solid ${C.rule};text-align:center;">${label}<div style="font-family:${SANS};height:30px;line-height:30px;">${body}</div></td>`;
}

function stagesRow(run: MonitorRun): string {
  const cells = STAGES.map((_, i) => stageCell(run.stages.find((x) => x.n === i + 1), i)).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed;"><tr>${cells}</tr></table>`;
}

export type DigestInput = {
  run: MonitorRun;
  events: MonitorEvent[];
  base: string; // siteUrl
  unsubscribeUrl: string;
  test?: boolean;
};

function oneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

export function digestMail({ run, events, base, unsubscribeUrl, test }: DigestInput): MailContent {
  const headline = shortHeadline(run.headline);
  const subject = `${test ? "[테스트] " : ""}[교원 육아휴직 입법 모니터] ${VERDICTS[run.verdict].label}: ${headline}`;
  const next = run.stages.find((s) => s.status === "in_progress");
  const alt = run.alternatives[0]?.link;

  const eventsHtml = events.length
    ? events
        .map((e) => {
          const detail = e.detail ? `<div style="font-size:13px;line-height:1.6;color:${C.ink2};max-height:3.2em;overflow:hidden;">${h(oneLine(e.detail, 140))}</div>` : "";
          const links = (e.sources || [])
            .slice(0, 3)
            .map((s) => `<a href="${h(s.url)}" style="color:${C.green};">${h(s.label)}</a>`)
            .join(" · ");
          return `<tr><td style="padding:10px 0;border-top:1px solid ${C.rule};font-family:${SANS};"><div style="font-size:14px;font-weight:bold;line-height:1.5;color:${C.ink};">${h(e.title)}</div>${detail}${links ? `<div style="font-size:12px;padding-top:4px;">${links}</div>` : ""}</td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:10px 0;border-top:1px solid ${C.rule};font-family:${SANS};font-size:13px;color:${C.ink3};">새로 확인된 변화 항목이 없습니다.</td></tr>`;

  const inner = `
<tr><td style="padding:22px 24px 6px 24px;font-family:${SANS};">
${test ? `<div style="margin-bottom:12px;padding:8px 10px;background:#FFF4D1;color:#8A5A00;font-size:13px;font-weight:bold;">테스트 발송입니다. 실제 구독자에게 보낸 메일이 아닙니다.</div>` : ""}
<div style="padding-bottom:10px;">${pill(run.verdict)}</div>
<div style="font-family:${SERIF};font-size:21px;line-height:1.45;font-weight:bold;color:${C.ink};">${h(headline)}</div>
</td></tr>
<tr><td style="padding:18px 24px 6px 24px;">${sectionLabel("무엇이 바뀌었나")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${eventsHtml}</table></td></tr>
<tr><td style="padding:18px 24px 6px 24px;">${sectionLabel("지금 단계")}${stagesRow(run)}${
    next ? `<div style="font-family:${SANS};font-size:13px;color:${C.ink2};padding-top:8px;">다음 관문: <b style="color:${C.ink};">${h(next.label)}</b></div>` : ""
  }</td></tr>
<tr><td style="padding:18px 24px 6px 24px;">${sectionLabel("다음 예상 단계 (추정)")}<div style="font-family:${SANS};font-size:14px;line-height:1.7;color:${C.ink2};border-left:3px solid ${C.rule};padding-left:10px;"><span style="display:inline-block;margin-right:6px;padding:0 6px;border:1px solid ${C.ink3};border-radius:3px;font-size:11px;color:${C.ink3};">추정</span>${h(run.outlook.text)}<div style="font-size:12px;color:${C.ink3};padding-top:4px;">확정된 사실이 아닌 추정입니다.</div></div></td></tr>
<tr><td style="padding:20px 24px 8px 24px;">${button(`${base}/timeline`, "타임라인 자세히 보기")}
<div style="font-family:${SANS};font-size:13px;line-height:1.9;padding-top:12px;color:${C.ink2};"><a href="${h(base)}/" style="color:${C.green};">모니터 첫 화면</a>${alt ? ` · <a href="${h(alt)}" style="color:${C.green};">대안 법안 보기</a>` : ""}</div></td></tr>
<tr><td style="padding:18px 24px 22px 24px;"><div style="border-top:1px solid ${C.rule};padding-top:14px;font-family:${SANS};font-size:12px;line-height:1.7;color:${C.ink3};">이 메일은 입법 모니터 알림 구독을 확인하신 분께만 보냅니다. 입법 단계에 변화가 있거나 확인이 불확실할 때만 발송합니다.<br><a href="${h(unsubscribeUrl)}" style="color:${C.ink2};font-weight:bold;">한 번에 구독 해지하기</a></div></td></tr>`;

  const stageText = STAGES.map((st, i) => {
    const s = run.stages.find((x) => x.n === i + 1);
    const state = s?.status === "done" ? `완료${s.date ? ` (${s.date})` : ""}` : s?.status === "in_progress" ? "다음 관문" : "대기";
    return `${CIRCLED[i]} ${st.label}: ${state}`;
  }).join("\n");
  const eventsText = events.length
    ? events
        .map((e) => [`- ${e.title}`, e.detail ? `  ${oneLine(e.detail, 140)}` : "", ...(e.sources || []).slice(0, 3).map((s) => `  ${s.label}: ${s.url}`)].filter(Boolean).join("\n"))
        .join("\n")
    : "새로 확인된 변화 항목이 없습니다.";
  const text = [
    test ? "[테스트 발송] 실제 구독자에게 보낸 메일이 아닙니다.\n" : "",
    `${VERDICTS[run.verdict].label}: ${headline}`,
    "",
    "[무엇이 바뀌었나]",
    eventsText,
    "",
    "[지금 단계]",
    stageText,
    "",
    "[다음 예상 단계 (추정)]",
    `${run.outlook.text}\n(확정된 사실이 아닌 추정입니다.)`,
    "",
    `타임라인: ${base}/timeline`,
    `첫 화면: ${base}/`,
    alt ? `대안 법안: ${alt}` : "",
    "",
    "이 메일은 입법 모니터 알림 구독을 확인하신 분께만 보냅니다.",
    `구독 해지: ${unsubscribeUrl}`,
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");

  return { subject, html: shell(`${VERDICTS[run.verdict].label}: ${headline}`, inner), text };
}
