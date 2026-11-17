import Link from "next/link";
import CopyBox from "@/components/CopyBox";
import { MilestoneGauge } from "@/components/Gauge";
import { ExtLink, SectionHead, Tag } from "@/components/ui";
import { fetchCommitteeMembers, SERVICES, type CommitteeMember } from "@/lib/assembly";
import { boardStats, loadOfficePhones } from "@/lib/board";
import { daysBetween, kstDate, SESSION_END } from "@/lib/config";
import { latestRun } from "@/lib/data";
import { buildCallScript } from "@/lib/pickle";

export const revalidate = 3600;
export const metadata = { title: "행동하기 · 교원 육아휴직 12세 입법 모니터" };

async function members(c: string): Promise<{ list: CommitteeMember[]; error?: string }> {
  try {
    return { list: await fetchCommitteeMembers(c) };
  } catch (e) {
    return { list: [], error: (e as Error).message };
  }
}

const CALL = `안녕하세요. 저는 ○○(지역)에 사는 ○○(학부모/교사)입니다.
교육위원회 법안소위가 11월 17일 의결한 교육공무원법 개정 대안, 교원 육아휴직 대상 자녀를 만 8세(초2)에서 만 12세(초6)로 넓히는 내용 때문에 전화드렸습니다.
초등 고학년 돌봄 공백이 실제로 큽니다. 이번 정기회(12월 9일 종료) 안에 교육위 전체회의, 법사위, 본회의까지 처리될 수 있도록 의원님께서 챙겨 주시길 부탁드립니다. 사립학교 교원에게도 같은 기준이 적용되도록 사립학교법 대안도 함께 부탁드립니다.
들어주셔서 감사합니다.`;

const EMAIL = `제목: 교원 육아휴직 12세 확대(교육공무원법 대안) 정기회 내 처리 요청

○○○ 의원님께,

저는 ○○(지역)에 거주하는 ○○(학부모/교사)입니다.
2026년 11월 17일 교육위원회 법안심사소위원회는 교원 육아휴직 대상 자녀를 ‘만 8세 이하 또는 초등학교 2학년 이하’에서 ‘만 12세 이하 또는 초등학교 6학년 이하’로 확대하는 교육공무원법 개정안들을 대안으로 반영하기로 의결했습니다(사립학교법 개정안도 함께).

초등 고학년 시기에도 돌봄 수요가 크며, 일반 공무원과의 형평 측면에서도 필요한 개정입니다. 정기회가 끝나는 12월 9일 이전에 교육위원회 전체회의 의결과 법제사법위원회 체계·자구 심사, 본회의 의결이 이뤄질 수 있도록 관심을 부탁드립니다.

감사합니다.
○○○ 드림 (연락처는 선택)`;

const TIPS = [
  { t: "교육위 위원장·여야 간사·법안소위 위원에 집중", d: "의사일정은 위원장과 간사 협의로 정해집니다. 전체회의 상정이 다음 관문이므로 이분들께 먼저 의견을 전하세요." },
  { t: "법사위 체계·자구 심사 단계 대비", d: "교육위를 통과하면 법사위로 갑니다. 법사위원장·간사에게 ‘이견 없는 민생법안’으로 신속히 처리해 달라고 요청하세요." },
  { t: "본인 이름으로, 지역구 유권자임을 밝히고 정중하게", d: "의원실은 지역구 유권자의 직접 연락을 가장 무겁게 받아들입니다. 반복 전화보다 한 번의 정중한 개인 연락이 효과적입니다." },
  { t: "공식 이메일·홈페이지 의견란 활용", d: "아래 명단의 공식 이메일(국회 공개 자료)로 짧고 구체적으로 보내세요. 시행일과 사립교원 동반 적용을 함께 언급하면 좋습니다." },
  { t: "교원단체 공동 성명과 연계", d: "교총·교사노조·전교조 등 교원단체의 공동 입장 발표는 여야 모두에 신호가 됩니다. 소속 단체에 의견을 전하세요." },
  { t: "국민신문고·교육부 의견 제출", d: "시행일을 앞당기고 사립학교 교원에도 같은 기준이 적용되도록 교육부에 의견을 낼 수 있습니다." },
  { t: "정기회 종료(12/9) 전 본회의 상정이 핵심", d: "정기회 안에 처리되지 않으면 다음 회기로 미뤄질 수 있습니다. 남은 기간을 주변에 알리고 함께 응원하세요." },
];

const SAYS = [
  { t: "모인 지지의 수", d: "그때까지 모인 ‘빠른 입법 지지’ 메모 수를 그대로 전합니다." },
  { t: "대표 메모 요약", d: "대표 메모 1~2개를 짧게 읽습니다. 닉네임·연락처 같은 작성자 정보는 빼고 내용만 전합니다." },
  { t: "한 가지 요청", d: "정기회가 끝나는 12월 9일 전에 위원회 대안을 신속히 의결해 달라는 요청 하나만 합니다." },
];

const RULES = [
  "100개마다 의원 사무실당 1회만 겁니다. 같은 사무실에 되풀이해 걸지 않습니다.",
  "평일 업무시간(10:00–17:00)에만 겁니다.",
  "첫마디에 AI 비서임을 밝히고, 짧고 정중하게 말합니다.",
  "부재 중이면 한 번만 다시 걸고, 그래도 안 되면 넘어갑니다.",
  "운영자가 통화 내용과 대상 번호를 확인·승인한 뒤 시작합니다.",
  "결과(통화완료·부재·거절)는 타임라인에 공개합니다. 개인정보는 남기지 않습니다.",
];

export default async function Act() {
  const dday = daysBetween(kstDate(), SESSION_END);
  const [edu, jud, phones, stats, run] = await Promise.all([
    members("교육위원회"),
    members("법제사법위원회"),
    loadOfficePhones(),
    boardStats().catch(() => ({ total: 0, support: 0, other: 0, nextMilestone: 100, progress: 0 })),
    latestRun(),
  ]);
  const judLeaders = jud.list.filter((m) => m.role !== "위원");
  const script = buildCallScript(stats.support, [], run?.stage ?? 1);

  return (
    <div className="pt-10 sm:pt-14">
      <p className="text-[13px] font-semibold text-grid">
        정기회 종료까지 <span className="tnum">{dday > 0 ? `D-${dday}` : dday === 0 ? "오늘" : "지남"}</span>
      </p>
      <h1 className="mt-2 font-serif text-[34px] font-bold leading-tight tracking-tight sm:text-[44px]">행동하기</h1>
      <p className="mt-3 max-w-[36em] text-[16px] leading-relaxed text-ink-2">게시판에 남긴 메모 한 줄이 모여 의원실에 전해집니다. 직접 연락하실 분을 위한 문안과 명단도 아래에 있습니다.</p>

      {/* ── 피클 ── */}
      <section id="pickle" aria-labelledby="pickle-h" className="mt-10 scroll-mt-4 rounded-xl border border-seal/30 bg-sheet p-5 sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <h2 id="pickle-h" className="font-serif text-[24px] font-bold leading-[1.55] tracking-tight text-ink sm:text-[30px]">
              빠른 입법 지지 메모가 <span className="tnum text-seal-ink">100개</span> 모일 때마다, 교육위원회 국회의원 지역사무실에 AI 비서 ‘피클(Pickle)’이 여러분의 목소리를 모아 전화를 겁니다.
            </h2>
            <div className="mt-6 max-w-md">
              <MilestoneGauge stats={stats} compact />
            </div>
            <Link href="/#board" className="mt-6 inline-block rounded-md bg-ink px-5 py-3 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-[#0b1325]">
              지지 메모 남기기
            </Link>
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">통화에서 전하는 말</h3>
              <ol className="mt-2 divide-y divide-rule border-y border-rule">
                {SAYS.map((s, i) => (
                  <li key={s.t} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 py-2.5">
                    <span className="font-serif text-lg font-bold leading-6 text-seal-ink">{i + 1}</span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{s.t}</p>
                      <p className="text-[14px] leading-relaxed text-ink-2">{s.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">통화 원칙</h3>
              <ul className="mt-2 space-y-1.5 text-[14px] leading-relaxed text-ink-2">
                {RULES.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-seal" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[13px] text-ink-3">
                대상: 출처를 확인한 교육위원회 위원 지역사무실 공개 번호. 법안이 법사위로 넘어가면 법사위원장·간사 사무실도 포함합니다.{" "}
                <Link href="/timeline" className="font-semibold text-ink underline decoration-grid/50 underline-offset-[3px] hover:decoration-ink">
                  통화 기록 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
        <details className="mt-6 border-t border-rule pt-4">
          <summary className="cursor-pointer select-none text-[15px] font-semibold text-ink hover:underline">피클의 30초 통화 문안 보기</summary>
          <p className="ruled mt-2 max-w-3xl font-serif text-[15px] text-ink">{script}</p>
          <p className="mt-1 text-xs text-ink-3">숫자는 현재 기준입니다. 대표 메모 1~2개는 실제 통화 때 넣습니다.</p>
        </details>
      </section>

      {/* ── 직접 하기 ── */}
      <section aria-labelledby="tips-h" className="mt-14">
        <SectionHead id="tips-h" eyebrow="직접 참여" title="효과적인 참여 방법" />
        <ul className="grid gap-x-10 gap-y-5 border-t border-rule pt-5 md:grid-cols-2">
          {TIPS.map((t) => (
            <li key={t.t}>
              <p className="text-[16px] font-semibold text-ink">{t.t}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{t.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tpl-h" className="mt-14">
        <SectionHead id="tpl-h" eyebrow="복사해서 쓰는" title="문안 템플릿" />
        <div className="grid gap-4 lg:grid-cols-2">
          <CopyBox title="30초 전화 문안" text={CALL} />
          <CopyBox title="이메일 문안" text={EMAIL} />
        </div>
        <p className="mt-3 text-[13px] text-ink-3">욕설·협박·반복 전화는 오히려 역효과입니다. 개인 휴대전화로 연락하지 말고 공개된 의원실 번호·이메일만 쓰세요.</p>
      </section>

      <section aria-labelledby="edu-h" className="mt-14">
        <SectionHead id="edu-h" eyebrow={`출처: 열린국회정보(${SERVICES.committeeMembers})`} title="국회 교육위원회 위원" />
        <MemberList data={edu} />
      </section>

      <section aria-labelledby="jud-h" className="mt-14">
        <SectionHead id="jud-h" eyebrow="체계·자구 심사 단계" title="법제사법위원회 위원장·간사" />
        <MemberList data={{ list: judLeaders, error: jud.error }} />
      </section>

      <section aria-labelledby="ph-h" className="mt-14">
        <SectionHead id="ph-h" eyebrow="공개 출처의 유선번호만" title="지역사무실 전화번호" />
        {phones.length === 0 ? (
          <p className="text-ink-2">아직 모은 번호가 없습니다.</p>
        ) : (
          <ul className="grid gap-x-8 border-t border-rule sm:grid-cols-2">
            {phones.map((p) => (
              <li key={p.name + p.phone} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-rule py-2.5">
                <span className="min-w-0">
                  <b className="font-semibold">{p.name}</b> <span className="text-[13px] text-ink-3">{p.office.replace(/^지역사무실\s*—\s*/, "")}</span>
                </span>
                <span className="flex items-center gap-2">
                  <a className="tnum text-[15px] font-semibold text-ink underline decoration-grid/50 underline-offset-[3px] hover:decoration-ink" href={`tel:${p.phone.split(/[ (]/)[0]}`}>
                    {p.phone}
                  </a>
                  {p.sourceVerified ? <Tag tone="green">출처 확인</Tag> : <Tag tone="amber">출처 미확인</Tag>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13px] text-ink-3">국회 공개 자료·의원 공식 채널에 게재된 지역사무실 번호만 싣습니다. 번호가 바뀌었을 수 있으니 통화 전 확인하세요. 개인 휴대전화는 모으지도 싣지도 않습니다.</p>
      </section>
    </div>
  );
}

function MemberList({ data }: { data: { list: CommitteeMember[]; error?: string } }) {
  if (data.error)
    return (
      <p className="text-ink-2">
        명단을 불러오지 못했습니다. <ExtLink href="https://edu.na.go.kr">교육위원회 홈페이지</ExtLink>에서 확인하세요.
      </p>
    );
  if (!data.list.length) return <p className="text-ink-2">명단이 없습니다.</p>;
  return (
    <ul className="grid gap-x-8 border-t border-rule md:grid-cols-2">
      {data.list.map((m) => (
        <li key={m.name + m.committee} className="border-b border-rule py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[16px] font-semibold text-ink">{m.name}</p>
            {m.role !== "위원" && <Tag tone={m.role === "위원장" ? "seal" : "ink"}>{m.role}</Tag>}
            <span className="text-[13px] text-ink-3">
              {m.party} · {m.district}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {m.tel && (
              <a className="tnum text-ink-2 underline decoration-rule underline-offset-[3px] hover:text-ink hover:decoration-ink" href={`tel:${m.tel.split(/[ (~]/)[0]}`}>
                {m.tel}
              </a>
            )}
            {m.email && (
              <a className="break-all text-ink-2 underline decoration-rule underline-offset-[3px] hover:text-ink hover:decoration-ink" href={`mailto:${m.email}`}>
                {m.email}
              </a>
            )}
            {m.room && <span className="text-ink-3">의원회관 {m.room}</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}
