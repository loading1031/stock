# stock — 자동매매 플랫폼

한국투자증권(KIS) 모의투자로 시작해 실전·다른 증권사로 넓혀 가는 개인용 자동매매 플랫폼이다. 로컬 단독 사용이 전제다.

**현재 상태: 기획 중. 애플리케이션 코드 없음 (M0 이전).**

## 문서

| 파일 | 내용 |
|---|---|
| `docs/planning/plan.md` | 전체 기획: 기능, 아키텍처, 데이터 모델, 마일스톤(M0~M7), 확인 필요 항목 |
| `docs/planning/m0-foundation.md` | M0 설계: 실측 버전, 실험 결과, 빌드·구조·이벤트 결정 (B-01) |
| `docs/planning/frontend.md` | 프론트엔드: Next.js BFF, 인증(Next 세션 + 서비스 키), SSE, 차트, 화면 목록, 자동 주문 끄기·미체결 주문 취소 (B-03) |
| `.claude/rules/frontend.md` | 프론트엔드 프로젝트 전용 규칙(BFF, SSE, 차트, 주문 화면). `frontend/` 파일 작업 때만 적용. 범용 규칙은 `nextts` 플러그인 |
| `docs/planning/strategy.md` | 운영 전략: 워크플로(Mermaid), jev 배치, 위험 예산, 포지션 계획, 매도, 교체 매매, 평가 |
| `docs/planning/backlog.md` | 다음에 기획할 후보 목록 |
| GitHub 이슈 (라벨 [`plan`](https://github.com/loading1031/stock/issues?q=label%3Aplan)) | **작업지시서**: 항목마다 이슈 하나(본문 = 지시서, 댓글 = 진행 메모). 다음 세션이 이전 대화 없이 시작하도록 쓴다. 번호는 backlog.md의 이슈 칸 |
| `docs/planning/log.md` | 기획 결정 이력 |
| 시각화 문서 (Claude Docs) | https://claude.ai/code/artifact/a712f001-c5c0-4731-8015-d1bed440fac6 — 다이어그램 모음 |

기획 문서 규칙은 `planning` 플러그인의 `rules` 스킬과 아래 "기획 설정"을 따른다.

## 기획 설정
planning 플러그인이 읽는 설정값. **진행 절차(명령 순서, 커밋·브랜치·이슈 규칙)는 플러그인 스킬이 원본**이라 여기에 옮겨 적지 않는다.

- 기획 폴더: docs/planning
- 기준 문서: plan.md
- 시각화 문서: https://claude.ai/code/artifact/a712f001-c5c0-4731-8015-d1bed440fac6 (Claude Docs 도구로 고치고, 다이어그램은 스크린샷으로 렌더링 확인)
- 용어: 아래 "용어" 절
- 금지어: 단계, 킬 스위치
- 기본 브랜치: main
- 개발 브랜치: dev (코드 브랜치는 dev에서 분기하고 dev로 PR. 기획은 main)
- 기획 브랜치: plan/<ID>-<slug> (예: plan/B-03-frontend)
- 합치기 방식: PR (머지 커밋, PR 본문의 `Closes #<이슈>`로 이슈를 닫음)
- 작업지시서: issue (GitHub 이슈, 라벨 `plan`. 진행 메모는 댓글)
- 코드 브랜치: `<종류>/M<번호>-<slug>`(예: `feat/M1-auth`), 작업에 이슈가 있으면 `<종류>/<이슈 번호>-<slug>`. `dev`에서 만든다. 상세는 `docs/planning/m0-foundation.md`

### 동기화 표
| 바뀐 것 | 함께 고칠 곳 |
|---|---|
| 기능·아키텍처 | plan.md 해당 절, 데이터 모델(5장), 마일스톤(7장), 확인 필요(8장) |
| 운영 전략 | strategy.md 해당 장, **0장 Mermaid 먼저**, 그다음 시각화 문서의 "운영 전략 워크플로" |
| 테이블 | plan.md 5장 또는 strategy.md 18장, 시각화 문서 "데이터 모델" |
| 용어 | plan.md 1장 용어 설명, strategy.md 머리말, 이 파일의 "용어" |
| 결정된 사항 | 이 파일의 "결정된 사항" 표 |

## 용어

- **운영 시기**: 모의 운영 → 실전 운영 → 확장
- **개발 마일스톤**: M0 ~ M7 (`plan.md` 7장)
- **자동 주문 끄기**: 강제 청산을 포함한 새 자동 주문을 막는 켜기·끄기. **미체결 주문 취소**: 고른 종목·방향의 미체결만 취소. "킬 스위치"라는 말은 쓰지 않는다(뜻이 넓어 "전량 청산"으로 오해된 적이 있다).
- "1단계", "2단계" 같은 "단계"라는 말은 쓰지 않는다. 두 체계가 섞여 혼란이 생긴 적이 있다.

## 기획 진행 방식

`/planning:backlog`로 시작한다(backlog.md "권장 순서" → `pick <ID>`가 이슈를 읽는다). 절차와 규칙은 planning 스킬에 있다. `/planning:`이 자동완성되지 않으면, 셸에서 `claude plugin marketplace update loading1031-plugins && claude plugin update planning@loading1031-plugins` 후 재시작한다.

## 결정된 사항

바꾸려면 `log.md`에 이유와 함께 기록하고 관련 문서를 모두 고친다.

| 항목 | 결정 |
|---|---|
| 스택 | JDK 25, Kotlin 2.3+, Spring Boot 4.1, Gradle 9.1+, PostgreSQL + TimescaleDB, Docker Compose |
| 에디터 | Zed + Claude Code |
| 구조 | 모듈러 모놀리스, out 포트 헥사고날, 기능 우선 패키지 (`kopring` 플러그인, M0에서 `/kopring:init`). 단일 Gradle 모듈, 기본 패키지 `com.loading1031.stock` |
| 기능 경계 | 다른 기능은 `adapter/out`(상대 `application/service` 호출)과 이벤트 리스너(상대 `domain/event` 수신)에서만 참조. 순환 금지. ArchUnit으로 검사 |
| 영속성 | JPA + Kotlin JDSL. 시계열만 `JdbcClient` + SQL (명시적 예외, 일괄 삽입은 `NamedParameterJdbcTemplate`) |
| 모듈 간 소통 | Spring 내부 이벤트 + Spring Modulith 이벤트 발행 기록(Postgres). Kafka·Redis·R2DBC는 쓰지 않음 |
| 프론트엔드 | Next.js(App Router, 서버 컴포넌트)를 BFF로, TypeScript + pnpm + Turbopack(Next 기본 번들러) + React Compiler(`useMemo`·`useCallback`·`React.memo`는 쓰지 않고 컴파일러에 맡김), 같은 저장소 `frontend/`. shadcn/ui, 차트는 Lightweight Charts(캔들·실시간) + Recharts(성과). 실시간은 SSE. Next가 사용자 세션을 맡고 Spring은 서비스 키로 Next 요청만 받음(JWT·Refresh 없음). `docs/planning/frontend.md` |
| 증권사·데이터 | KIS Open API (주문, 국내·해외 시세, 선물). 과거 일봉 백필은 KRX Open API |
| 판단 모델 | Ollama 결정 모델 jev(`nimble`). 판단만, 숫자는 코드, 한도는 규칙 |
| 테스트 | JUnit 6, 뮤테이션 테스트 PIT(`domain`·`application/service`, 변경분은 `git diff`로 대상 지정, 기준선 없음), ArchUnit |
| 로컬 실행 | Docker Compose는 TimescaleDB만(`2.26.1-pg18`, `127.0.0.1`), Ollama는 Mac에서 직접. Flyway 계정과 앱 계정 분리 |

## 플러그인

이 프로젝트는 `.claude/settings.json`에서 아래 플러그인을 켠다. 마켓플레이스 `loading1031-plugins`는 GitHub [loading1031/claude-plugins](https://github.com/loading1031/claude-plugins)(public)에서 받는다. 로컬 편집 저장소는 `~/Documents/claude-plugins`.

| 플러그인 | 쓰임 |
|---|---|
| `planning` | 기획 진행 (`/planning:backlog` → `spec` → `commit` → `done`, `handoff`). git 명령 검사 훅(add -A, 커밋 접두어·Refs, 금지어) |
| `kopring` | Kotlin + Spring 컨벤션. `.kt` 작업 시 규칙 자동 적용, 편집 전 검사 훅 |

플러그인 자체를 고칠 때는 마켓플레이스 저장소에서 고친다. 이 저장소에 규칙·명령을 복사하지 않는다. 고친 뒤 GitHub에 push하면 반영된다. 플러그인에 버전 번호가 없어 커밋이 곧 버전이고, `.claude/settings.json`의 `extraKnownMarketplaces`에 `autoUpdate: true`를 켜 두어 세션 시작 후 백그라운드로 받는다(다음 실행 또는 `/reload-plugins`에 적용). 바로 받으려면 `claude plugin marketplace update loading1031-plugins && claude plugin update planning@loading1031-plugins`. 로컬 폴더를 고치는 것만으로는 적용되지 않는다.

## 코드 작업 (M0 이후)

M0에서 `/kopring:init hexagonal`로 컨벤션 선언과 pre-commit 훅을 설치하고 이 절을 확정한다. 그 전에는 애플리케이션 코드를 쓰지 않는다. M0 구현 순서는 `docs/planning/m0-foundation.md` "M0 구현 체크리스트".

초안 (B-01, 2026-10-13. M0에서 확정):
- JDK는 설치하지 않는다. Gradle 툴체인이 JDK 25를 받는다. 로컬 DB는 Docker Desktop을 켠 뒤 `./gradlew bootRun`(Compose 자동 실행). Ollama는 Mac에서 직접 실행
- 커밋 전에 `./gradlew test`(컨텍스트 로딩·ArchUnit 포함)를 돌린다
- 도메인·서비스 코드를 바꿨으면 `./gradlew pitestChanged`를 돌리고, 살아남은 뮤턴트를 4분류한다(테스트 추가 / 동등 / 쓸모없는 코드 삭제는 확인 후 / 보류). 미분류를 남기지 않고, 동등·보류의 이유는 커밋 본문에 쓴다
- 현재 시각은 주입한 `Clock`에서, 소수는 `BigDecimal`에 반올림 방식을 명시해서(kopring 훅이 막는다)
- 다른 기능은 `adapter/out`(상대 서비스 호출)과 이벤트 리스너에서만 참조한다(ArchUnit이 막는다)
- 비밀값은 `.env`에만. App Secret은 비밀 타입으로 받는다(B-10)

## Git

- 원격: GitHub [loading1031/stock](https://github.com/loading1031/stock)(public). `.env`와 키·계좌번호는 절대 올리지 않는다.
- 커밋·브랜치·PR 규칙은 planning 스킬(`/planning:commit`, `/planning:done`)을 따른다.
- 문서는 한국어로 쓴다.
