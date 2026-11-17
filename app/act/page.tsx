import CopyBox from "@/components/CopyBox";
import { Card, ExtLink, Pill } from "@/components/ui";
import { fetchCommitteeMembers, SERVICES, type CommitteeMember } from "@/lib/assembly";
import { loadOfficePhones } from "@/lib/board";
import { daysBetween, kstDate, SESSION_END } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "행동하기 · 교원 육아휴직 입법 모니터" };

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
2026년 11월 17일 교육위원회 법안심사소위원회는 교원 육아휴직 대상 자녀를 '만 8세 이하 또는 초등학교 2학년 이하'에서 '만 12세 이하 또는 초등학교 6학년 이하'로 확대하는 교육공무원법 개정안들을 대안으로 반영하기로 의결했습니다(사립학교법 개정안도 함께).

초등 고학년 시기에도 돌봄 수요가 크며, 일반 공무원과의 형평 측면에서도 필요한 개정입니다. 정기회가 끝나는 12월 9일 이전에 교육위원회 전체회의 의결과 법제사법위원회 체계·자구 심사, 본회의 의결이 이뤄질 수 있도록 관심을 부탁드립니다.

감사합니다.
○○○ 드림 (연락처는 선택)`;

const TIPS = [
  { t: "교육위 위원장·여야 간사·법안소위 위원에 집중", d: "의사일정은 위원장과 간사 협의로 정해집니다. 전체회의 상정이 다음 관문이므로 이분들께 먼저 의견을 전하세요." },
  { t: "법사위 체계·자구 심사 단계 대비", d: "교육위를 통과하면 법사위로 갑니다. 법사위원장·간사에게 '이견 없는 민생법안'으로 신속 처리해 달라고 요청하세요." },
  { t: "본인 이름으로, 지역구 유권자임을 밝히고 정중하게", d: "의원실은 지역구 유권자의 직접 연락을 가장 무겁게 받아들입니다. 대리 발신·반복 전화보다 한 번의 정중한 개인 연락이 효과적입니다." },
  { t: "공식 이메일·홈페이지 의견란 활용", d: "아래 명단의 공식 이메일(국회 공개 자료)로 짧고 구체적으로 보내세요. 시행일과 사립교원 동반 적용을 함께 언급하면 좋습니다." },
  { t: "교원단체 공동 성명과 연계", d: "교총·교사노조·전교조 등 교원단체의 공동 입장 발표는 여야 모두에 신호가 됩니다. 소속 단체에 의견을 전달해 보세요." },
  { t: "국민신문고·교육부 의견 제출", d: "시행일을 앞당기고 사립학교 교원에도 동일 적용되도록 교육부에 의견을 낼 수 있습니다." },
  { t: "정기회 종료(12/9) 전 본회의 상정이 핵심", d: "정기회 안에 처리되지 않으면 다음 회기로 미뤄질 수 있습니다. 남은 기간을 주변에 알리고 함께 응원해 주세요." },
];

export default async function Act() {
  const dday = daysBetween(kstDate(), SESSION_END);
  const [edu, jud, phones] = await Promise.all([members("교육위원회"), members("법제사법위원회"), loadOfficePhones()]);
  const judLeaders = jud.list.filter((m) => m.role !== "위원");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-civic-900">행동하기</h1>
        <p className="mt-1 text-sm text-slate-600">정기회 종료(12/9)까지 {dday >= 0 ? `D-${dday}` : "종료"}. 정중하고 구체적인 한 번의 연락이 가장 효과적입니다.</p>
      </div>

      <Card title="효과적인 참여 방법">
        <ol className="space-y-3">
          {TIPS.map((t, i) => (
            <li key={t.t} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-civic-600 text-xs font-bold text-white">{i + 1}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{t.t}</p>
                <p className="text-xs leading-relaxed text-slate-600">{t.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="문안 템플릿">
        <div className="space-y-3">
          <CopyBox title="30초 전화 문안" text={CALL} />
          <CopyBox title="이메일 문안" text={EMAIL} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">욕설·협박·반복 전화는 오히려 역효과입니다. 개인 휴대전화로 연락하지 마시고 공개된 의원실 번호·이메일만 이용하세요.</p>
      </Card>

      <Card title="국회 교육위원회 위원" right={<span className="text-[11px] text-slate-500">출처: 열린국회정보({SERVICES.committeeMembers})</span>}>
        <MemberList data={edu} />
      </Card>

      <Card title="법제사법위원회 위원장·간사" right={<span className="text-[11px] text-slate-500">체계·자구 심사 단계</span>}>
        <MemberList data={{ list: judLeaders, error: jud.error }} />
      </Card>

      <Card title="지역사무실 유선번호(공개 출처)" right={<Pill tone="amber">검증 전</Pill>}>
        {phones.length === 0 ? (
          <p className="text-sm text-slate-500">아직 수집된 번호가 없습니다.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {phones.map((p) => (
              <li key={p.name + p.phone}>
                <b>{p.name}</b> {p.office} · <a className="text-civic-600 underline" href={`tel:${p.phone}`}>{p.phone}</a> {p.verified ? <Pill tone="green">검증</Pill> : <Pill>미검증</Pill>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-500">국회 공개 자료에 게재된 지역사무실 번호만 싣습니다. 개인 휴대전화는 수집·게시하지 않습니다.</p>
      </Card>
    </div>
  );
}

function MemberList({ data }: { data: { list: CommitteeMember[]; error?: string } }) {
  if (data.error) return <p className="text-sm text-amber-800">명단을 불러오지 못했습니다({data.error}). <ExtLink href="https://edu.na.go.kr">교육위원회 홈페이지</ExtLink>에서 확인하세요.</p>;
  if (!data.list.length) return <p className="text-sm text-slate-500">명단이 없습니다.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {data.list.map((m) => (
        <li key={m.name + m.committee} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {m.name} {m.role !== "위원" && <Pill tone={m.role === "위원장" ? "red" : "amber"}>{m.role}</Pill>}
            </p>
            <p className="text-xs text-slate-500">
              {m.party} · {m.district}
              {m.room ? ` · 의원회관 ${m.room}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs">
            {m.tel && (
              <a className="text-civic-600 underline" href={`tel:${m.tel.split(/[ (~]/)[0]}`}>
                {m.tel}
              </a>
            )}
            {m.email && (
              <a className="text-civic-600 underline" href={`mailto:${m.email}`}>
                {m.email}
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
