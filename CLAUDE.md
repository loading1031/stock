# stock — 자동매매 플랫폼

한국투자증권(KIS) 모의투자로 시작해 실전·다른 증권사로 넓혀 가는 개인용 자동매매 플랫폼이다. 로컬 단독 사용이 전제다.

**현재 상태: 기획 중. 애플리케이션 코드 없음 (M0 이전).**

## 문서

| 파일 | 내용 |
|---|---|
| `docs/planning/plan.md` | 전체 기획: 기능, 아키텍처, 데이터 모델, 마일스톤(M0~M7), 확인 필요 항목 |
| `docs/planning/m0-foundation.md` | M0 설계: 실측 버전, 실험 결과, 빌드·구조·이벤트 결정 (B-01) |
| `docs/planning/strategy.md` | 운영 전략: 워크플로(Mermaid), jev 배치, 위험 예산, 포지션 계획, 매도, 교체 매매, 평가 |
| `docs/planning/backlog.md` | 다음에 기획할 후보 목록 |
| `docs/planning/work-orders.md` | **작업지시서**: 다음 세션이 이전 대화 없이 시작하도록 항목별로 적은 것. 세션 시작 시 여기부터 |
| `docs/planning/log.md` | 기획 결정 이력 |
| 시각화 문서 (Claude Docs) | https://claude.ai/code/artifact/a712f001-c5c0-4731-8015-d1bed440fac6 — 다이어그램 모음 |

기획 문서 규칙은 `planning` 플러그인의 `rules` 스킬과 아래 "기획 설정"을 따른다.

## 기획 설정
planning 플러그인(/planning:backlog → /planning:spec → /planning:commit → /planning:done)이 읽는다.

- 기획 폴더: docs/planning
- 기준 문서: plan.md
- 시각화 문서: https://claude.ai/code/artifact/a712f001-c5c0-4731-8015-d1bed440fac6 (Claude Docs 도구로 고치고, 다이어그램은 스크린샷으로 렌더링 확인)
- 용어: 아래 "용어" 절. "단계"라는 말은 쓰지 않는다
- 기본 브랜치: main
- 기획 브랜치: plan/<ID>-<slug> (예: plan/B-03-frontend)
- 코드 브랜치: M0 이후에 정한다 (B-01)

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
- "1단계", "2단계" 같은 "단계"라는 말은 쓰지 않는다. 두 체계가 섞여 혼란이 생긴 적이 있다.

## 기획 진행 방식

한 번에 하나씩 끝까지 닫는다. **백로그 항목 하나 = 브랜치 하나**, 세션 하나에서 항목 1~2개만 다룬다.

```
/planning:backlog              다음 주제 추천 (진행 중인 브랜치가 있으면 그것부터)
/planning:backlog pick <ID>    main에서 plan/<ID>-<slug> 브랜치를 만들고 논의 시작
   ↓
조사·논의                       사실은 출처를 열어 확인. 확인 못 한 것은 "검증하지 않음" 또는 확인 필요 항목으로
   ↓
/planning:spec <주제>          결정을 문서에 반영 + 동기화 + log 기록 (기획 브랜치에서만)
/planning:commit               docs: 커밋 (기획 브랜치에)
   ↓
/planning:done                 백로그 완료 처리 → main에 --no-ff 합치기 → 브랜치 삭제 (확인 후)
/planning:handoff              세션을 마치기 전, 다음 세션용 작업지시서 갱신
```

- 설정·도구 변경(`chore:`)은 main에 바로 커밋해도 된다. 기획(`docs:`)은 기획 브랜치에서 한다.

- 논의 중 새 주제가 나오면 바로 파고들지 말고 **백로그에 추가**한다. 지금 주제를 먼저 닫는다.
- 대화가 길어지면 멈추고, 결정된 것만 `/planning:spec`으로 반영한 뒤 나머지는 백로그에 남긴다.
- 사용자가 결정하지 않은 것은 문서에 "결정"으로 쓰지 않는다. 제안은 제안으로 적는다.

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
| 증권사·데이터 | KIS Open API (주문, 국내·해외 시세, 선물). 과거 일봉 백필은 KRX Open API |
| 판단 모델 | Ollama 결정 모델 jev(`nimble`). 판단만, 숫자는 코드, 한도는 규칙 |
| 테스트 | JUnit 6, 뮤테이션 테스트 PIT(`domain`·`application/service`, 변경분은 `git diff`로 대상 지정, 기준선 없음), ArchUnit |
| 로컬 실행 | Docker Compose는 TimescaleDB만(`2.26.1-pg18`, `127.0.0.1`), Ollama는 Mac에서 직접. Flyway 계정과 앱 계정 분리 |

## 플러그인

이 프로젝트는 `.claude/settings.json`에서 아래 플러그인을 켠다. 마켓플레이스 `loading1031-plugins`는 GitHub [loading1031/claude-plugins](https://github.com/loading1031/claude-plugins)(public)에서 받는다. 로컬 편집 저장소는 `~/Documents/claude-plugins`.

| 플러그인 | 쓰임 |
|---|---|
| `planning` | 기획 진행 (`/planning:backlog`, `/planning:spec`, `/planning:commit`) |
| `kopring` | Kotlin + Spring 컨벤션. `.kt` 작업 시 규칙 자동 적용, 편집 전 검사 훅 |

플러그인 자체를 고칠 때는 마켓플레이스 저장소에서 고친다. 이 저장소에 규칙·명령을 복사하지 않는다. 고친 뒤 GitHub에 push하고 `claude plugin marketplace update loading1031-plugins`를 실행해야 반영된다(로컬 폴더를 고치는 것만으로는 적용되지 않는다).

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

- 커밋은 `/planning:commit` 규칙을 따른다. 기획(`docs:`)과 코드 커밋을 섞지 않는다.
- 원격: GitHub [loading1031/stock](https://github.com/loading1031/stock)(public). `.env`와 키·계좌번호는 절대 올리지 않는다.
- 커밋 본문 끝에 `Refs: #<이슈 번호>`를 넣는다. B-18(이슈 이전) 전까지는 이슈가 있는 항목만(B-01 = #2), 없으면 `Refs: <백로그 ID>`. 이슈는 PR 본문의 `Closes #<번호>`로 닫는다.
- 코드 브랜치: `<종류>/M<번호>-<slug>`(예: `feat/M1-auth`). 코드 브랜치에서는 `docs/planning/`을 고치지 않는다. 상세는 `docs/planning/m0-foundation.md`.
- 이 폴더가 git worktree이고 `main`이 다른 폴더에 열려 있으면, `main`으로 합치는 일(`/planning:done`)은 `main`이 열린 폴더에서 한다.
- 문서는 한국어로 쓴다.
