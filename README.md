# 교원 육아휴직 12세 확대 입법 모니터 (edu-law-monitor)

교육공무원법 개정 **위원회 대안**(교원 육아휴직 대상 자녀 만 8세/초2 → 만 12세/초6)과 사립학교법 대안의 국회 진행 상황을
열린국회정보 공식 Open API로 하루 2회 추적하고, 시민 응원 게시판·이메일 알림·의원실 참여 가이드를 제공하는 Next.js 앱입니다.
상세 기획은 `PLAN.md`, 판정 원칙의 원본은 `docs-original-prompt-v3.md` 참고.

## 실행

```bash
export PATH=/opt/homebrew/bin:$PATH
npm install
cp .env.example .env.local   # ASSEMBLY_API_KEY 등 입력
npm run monitor              # 모니터 1회 실행(CLI, 결과 콘솔 출력 + 저장)
npm run dev                  # http://localhost:3210
npm run build && npm start   # 프로덕션 모드(포트 3210)
npm run sync:phones          # 교육위원 공개 지역사무실 번호 후보를 data/office-phones.json에 추가
```

## 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `ASSEMBLY_API_KEY` | ✔ | 열린국회정보 Open API 인증키 |
| `DATABASE_URL` | | 있으면 Postgres(`elm_records` 테이블 자동 생성), 없으면 `./data/store.json`. **Vercel 배포 시 필수**(파일시스템 쓰기 불가) |
| `ADMIN_TOKEN` | | `/admin` 및 `/api/admin/*` Bearer 토큰. 미설정 시 관리자 기능 비활성 |
| `CRON_SECRET` | | `/api/cron/monitor` Bearer 토큰(Vercel Cron이 자동 첨부). 미설정 시 크론 엔드포인트 401 |
| `SITE_URL` | | 이메일 링크용 절대 URL(기본 `http://localhost:3210`, Vercel에서는 `VERCEL_URL` 사용) |
| `IP_HASH_SALT` | | 게시판 IP 해시 솔트 |
| `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | | 네이버 검색 API(news/blog/cafearticle). 없으면 뉴스 수집 생략, UI에 "미설정" |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | | 뉴스 요약·전망·대표 메모 선정(기본 `claude-opus-4-5`). 없으면 규칙 기반 문구 |
| `RESEND_API_KEY` / `EMAIL_FROM` | | 이메일 발송. 없으면 콘솔 + `outbox` 컬렉션에 기록 |

## 검증된 열린국회정보 서비스 코드 (2026-11-18 KST 실호출 확인)

호출 형식: `https://open.assembly.go.kr/portal/openapi/<SERVICE>?KEY=..&Type=json&pIndex=1&pSize=100&...`
※ curl 기본 User-Agent는 "Bad Request"로 거부됨 → 앱은 브라우저형 User-Agent를 보냄.

| 용도 | 서비스 코드 | 주요 요청인자 | 주요 출력 | 사용처 |
|---|---|---|---|---|
| 국회의원 발의법률안 | `nzmimeepazxkubdpn` | `AGE`(필수), `BILL_NAME` | BILL_NO, PROC_RESULT … (의원 발의만, 위원장 대안 없음) | 참고 |
| 의안 검색(위원장 대안 포함) | `TVBPMBILL11` | `AGE`(필수), `BILL_NAME`, `PROPOSER` | PROPOSER_KIND(위원장/의원), PASS_GUBUN, CMT_PROC_RESULT_CD, PROC_RESULT_CD | **대안 자동 탐지**, 원안 상태 보조 |
| 의안정보 통합 | `ALLBILL` | `BILL_NO`(필수) | JRCMIT_PROC_DT/RSLT, LAW_CMMT_DT, LAW_PROC_DT, RGS_RSLN_DT, GVRN_TRSF_DT, PROM_DT/NO | **단계 판정**(소관위→법사위→본회의→이송→공포) |
| 의안 제안이유·주요내용 | `BPMBILLSUMMARY` | `BILL_NO` | SUMMARY | 대안 조문(12세·초6·'장기간') 확인 |
| 의안 관련 회의록 목록 | `VCONFBILLCONFLIST` | `BILL_ID` | CONF_DT, DOWN_URL(PDF) | 확인됨(향후 회의록 링크용, 현재 미사용) |
| 위원회 전체회의 일정 | `nttmdfdcaakvibdar` | `UNIT_CD=100022`, `COMMITTEE_NAME` | MEETING_DATE/TIME, ANGUN(안건 목록), LINK_URL2 | 교육위·법사위 전체회의 |
| 소위원회 일정 | `nrsldhjpaemrmolla` | `UNIT_CD=100022`, `COMMITTEE_NAME` | 동일(※ 전체회의 행도 섞여 나와 TITLE로 필터) | 교육위 법안소위 |
| 본회의 일정 | `nekcaiymatialqlxr` | `UNIT_CD=100022` | MEETTING_DATE/TIME, CONTS(의사일정) | 본회의 |
| 본회의 처리안건(법률안) | `nwbpacrgavhjryiph` | `AGE` | PROC_RESULT_CD, RGS_PROC_DT | 확인됨(보조, 현재 미사용) |
| 위원회 위원 명단 | `nktulghcadyhmiqxi` | `DEPT_NM`(예: 교육위원회) | JOB_RES_NM(위원장/간사), ASSEM_TEL, ASSEM_EMAIL, ROOM_NO | `/act` 명단·연락처, 지역사무실 번호 후보 |
| 국회의원 인적사항 | `nwvrqwxyaytdsfvhu` | `HG_NM` 등 | TEL_NO, E_MAIL, CMITS, HOMEPAGE | 확인됨(보조) |

서비스 이름은 응답 필드와 포털 메타데이터로 추정한 것이며, 코드는 모두 실데이터 반환을 확인했습니다.

## 판정 규칙 (docs-original-prompt-v3 이식)

세 상태 중 하나: **변화 있음 / 확인 불확실 / 변화 없음(확인 완료)**

- 기준선(2026-11-17): 제439회 제1차 교육위 법안소위에서 교육공무원법 4건(2200804·2200971·2216190·2221830)과 사립학교법 3건(2200968·2217235·2222256) **대안반영폐기** 의결 → 단계 ① 완료. 기준일 이전·당일 회의는 "기준선 교차확인"으로만 기록.
- **변화 있음**: 기준일 이후 위원장 대안 탐지(교육위원장 제안 + 기준일 이후, 과거 무관 대안 2217882 제외), 단계 진척(ALLBILL 일자), 대상 안건이 포함된 회의 예정/개최, 최근 48시간 관련 새 글.
- **확인 불확실**: 교육위·법사위·본회의가 열렸는데 안건이 비었거나 '소위 심사보고'처럼 포함 여부가 불명확, 안건에 포함됐는데 처리 결과가 API에 없음, 핵심 API 호출 실패/0건, 기사(통과·의결)와 API 단계 불일치.
- **변화 없음(확인 완료)**: 의안 API + 4개 일정 소스가 모두 성공하고 위 조건이 하나도 없을 때만. 단일 소스의 "기록 없음"만으로 선언하지 않음.
- 원안 처리결과에 11/17 대안반영폐기가 아직 안 보이는 것은 "API 최신성 지연" 메모로만 남기고 변화/불확실로 보지 않음.
- 이메일은 판정이 '변화 있음' 또는 '확인 불확실'이고 **새 이벤트**가 있을 때만 확인된 구독자에게 발송.

## 구조

- `lib/monitor/` — 의안(`bills.ts`), 회의(`meetings.ts`), 파이프라인·판정·전망·알림(`index.ts`)
- `lib/assembly.ts` — Open API 클라이언트(키는 로그/에러 메시지에 포함하지 않음)
- `lib/storage/` — Postgres/JSON 저장소 어댑터(컬렉션: runs, events, news, posts, subscribers, packets, outbox)
- `lib/board.ts` — 게시판(닉네임 선택, 입장, 200자, honeypot, IP 해시 rate limit 10분 3개·하루 10개, 링크 금지), 마일스톤 패킷
- `app/` — `/`, `/timeline`, `/news`, `/act`, `/admin`, API: `/api/posts`, `/api/subscribe`(+`/confirm`, `/unsubscribe`), `/api/cron/monitor`, `/api/admin/{run,posts,packets,status}`, `/api/status`
- `vercel.json` — 크론 UTC 22:00(KST 07:00), UTC 13:00(KST 22:00)

## 마일스톤 → 전화·문자 (안전 설계)

- '빠른 입법 지지' 메모가 100의 배수에 도달하면 **액션 패킷**만 대기열(`packets`)에 생성: 누적 수, 대표 메모 5개, 30초 통화 스크립트, 문자 문안, 대상(`data/office-phones.json`).
- 사이트는 **자동 전화·자동 문자를 절대 하지 않음**. `/admin`에서 사람이 출처 확인 → 승인 → 사이트 밖에서 실행 → 완료 체크.
- `data/office-phones.json`: `name, office, phone, sourceUrl, verified:false, sms` — 공개 출처 번호만. 현재 1건(박범계 의원 대전 사무실, 열린국회정보 위원 명단 ASSEM_TEL에 게재). 다른 위원은 API에 지역번호가 없어 수동 수집·검증 필요. `sms`는 의원실이 공식 공개한 문자 수신 번호만 기재(현재 없음).

## 알려진 한계

- 2026-11-18 현재 위원장 대안이 API에 미등록이고, 원안 7건의 처리결과도 null(반영 지연). 대안은 교육위 전체회의 의결 후 등록될 것으로 보이며, 앱은 그 전까지 ② 단계를 "대기"로 표시.
- 위원장 대안 PPSL_DT(제안일)가 실제 위원회 의결일보다 늦게 찍히는 사례가 있어(예: 2217882) 제안일·위원회 처리일 둘 다로 탐지.
- 회의 안건(ANGUN)은 사전 공지 의사일정이라 당일 변경·추가 안건이 빠질 수 있음 → 개최 후 결과는 의안 API로 재확인하며, 미반영 시 '확인 불확실'.
- 네이버·Anthropic·Resend 키는 미설정 상태로 검증(해당 기능은 graceful degrade, 실제 외부 호출 미검증).
- JSON 저장소는 단일 프로세스 개발용. 서버리스 배포에는 `DATABASE_URL` 필요.
- 시행일(⑦)은 API로 알 수 없어 공포 후 부칙 확인 필요.
