# 작업지시서

- 작성일: 2026-10-10
- 쓰임: 다음 세션이 이전 대화 없이 시작할 수 있도록, 백로그 항목마다 목표·읽을 것·정할 것·산출물·완료 기준을 적어 둔다. `/planning:backlog pick <ID>`가 이 문서의 해당 절을 먼저 읽는다.
- 항목이 끝나면(`/planning:done`) 해당 절을 지우고 log.md로 넘긴다. 중간에 멈추면 그 절의 "진행 메모"에 남긴다.

## 0. 세션 시작·종료 체크리스트

**시작**
1. Claude Code를 새로 시작했는지 확인. `/planning:`을 입력했을 때 `backlog`, `spec`, `commit`, `done`이 자동완성되면 플러그인이 잡힌 것이다. 안 되면 셸에서 `claude plugin list`로 `planning@loading1031-plugins`, `kopring@loading1031-plugins`가 enabled인지 확인
2. `git status`가 깨끗하고 `main`인지 확인 (진행 중인 브랜치가 있으면 그 브랜치로)
3. `/planning:backlog pick <ID>` → 이 문서의 해당 절을 읽고 시작

**종료**
1. 결정된 것은 `/planning:spec` → `/planning:commit`
2. 항목이 끝났으면 `/planning:done`. 안 끝났으면 브랜치를 두고 아래 해당 절의 "진행 메모"를 갱신해 커밋

## 1. 권장 순서

| 순서 | ID | 세션 | 사용자 준비물 |
|---|---|---|---|
| 1 | B-01 | M0 설계 | JDK 25 설치 여부 결정, Docker 동작 확인 |
| 2 | B-03 | 프론트엔드 기술과 화면 | 없음 |
| 3 | B-02 | KIS API 검증 | **KIS 모의투자 신청 + KIS Developers 모의 앱키 발급** |
| 아무 때나 | B-13, B-14 | 플러그인 저장소 정리 (claude-plugins 저장소에서) | GitHub 저장소 이름·공개 범위 결정 |
| 아무 때나 | 동기화 | 시각화 문서 동기화 빚 4건 해소 | 없음 |

B-02는 준비물이 있어야 의미가 있으므로, 그 전까지 B-01·B-03을 먼저 닫는다. 모의투자 신청은 미리 해 두면 좋다(신청 후 3개월 미접속 해지 주의).

---

## B-01 M0 설계: Claude·빌드 기반

- 브랜치: `plan/B-01-m0-foundation`
- 목표: M0 구현 세션이 **이 설계 문서만 보고** 프로젝트 골격을 만들 수 있게 한다.
- 산출물: `docs/planning/m0-foundation.md` (새 주제 템플릿), plan.md 2장·7장 M0 갱신, CLAUDE.md "코드 작업" 절 초안

### 읽을 것
- plan.md 2장(스택), 4장(아키텍처·패키지 구조), 5장(데이터 모델의 금액·시각 원칙), 7장 M0
- strategy.md 1장(원칙)
- kopring 플러그인: `guide` 스킬, `init` 스킬

### 정할 것 (사용자에게 물을 질문)
1. 기본 패키지 이름 (예: `com.<이름>.stock`)과 Gradle 구조 (단일 모듈 + 기능 우선 패키지 / 멀티 모듈)
2. **거래 규칙**과 강제 방법. 후보: 금액·가격에 `Double`/`Float` 금지, `Instant.now()`·`LocalDateTime.now()` 금지(`Clock` 주입), `BigDecimal` 연산에 `RoundingMode` 명시, 계좌번호·키 로깅 금지
   - 어디에 둘지: 프로젝트 전용 훅 / kopring 플러그인 규칙 추가 / 별도 `trading` 플러그인
3. 시계열 예외를 검사기에 반영할지: kopring 검사기의 기술 클라이언트 목록에 `JdbcClient` 추가 (플러그인 변경)
4. ArchUnit으로 강제할 의존 방향 범위 (헥사고날: `adapter.in → application.service → port.out ← adapter.out`)
5. PIT 설정 확정: 대상 패키지, `pitestChanged` 태스크, Claude 규칙(살아남은 뮤턴트 처리 4분류)
6. Docker Compose: TimescaleDB 이미지와 버전, Flyway 초기 마이그레이션 범위(M0에서는 빈 스키마? 인증 테이블까지?)
7. **코드 브랜치 규칙** (예: `feat/M1-auth`)과 기획 브랜치와의 관계
8. 컨텍스트 로딩 테스트와 샘플 도메인 클래스(PIT 동작 확인용)

### 조사할 것 (출처를 열어 확인)
- Spring Boot 4.1 최신 패치 버전, Kotlin 2.3+/2.4 최신, Gradle 최신 9.x, Kotlin JDSL 최신(Boot 4 지원 3.7+)
- **Spring Boot 4가 쓰는 JUnit 버전과 `pitest-junit5-plugin` 호환** (가장 큰 위험)
- TimescaleDB 공식 Docker 이미지 태그와 PostgreSQL 버전
- Zed Kotlin 확장(Kotlin LSP)이 Kotlin 2.3+·JDK 25에서 동작하는지

### 완료 기준
- 위 1~8에 결정 또는 "제안 + 확인 필요"가 적혀 있다
- M0 구현 체크리스트(만들 파일 목록, 실행할 명령, 확인 방법)가 문서에 있다
- 새로 생긴 주제는 백로그 후보로 옮겼다

### 진행 메모
(없음)

---

## B-03 프론트엔드 기술과 화면 목록

- 브랜치: `plan/B-03-frontend`
- 목표: M1(로그인 후 잔고 조회)부터 쓸 프론트엔드의 기술과 화면 범위를 정한다.
- 산출물: `docs/planning/frontend.md`, plan.md 2장(스택)·3.10(프론트엔드 API), CLAUDE.md "결정된 사항"

### 읽을 것
- plan.md 3.1(인증: JWT + Refresh), 3.10(프론트엔드 API·화면 목록), 7장(마일스톤별 완료 기준)
- strategy.md 16장(장부 비교·지표), 11장(킬 스위치), 0장(워크플로 — 판단 기록을 보여 줄 화면)

### 정할 것
1. **SPA로 갈지, 서버 렌더링(HTMX 등)으로 갈지.** 기획은 SPA 전제지만, 혼자 쓰는 로컬 도구라 서버 렌더링도 후보다. 결정에 따라 인증 방식(3.1)이 바뀐다
2. SPA라면 프레임워크(React/Vue/Svelte 등), 빌드 도구, UI 라이브러리
3. 저장소 위치 (같은 저장소 `frontend/` / 별도 저장소)
4. 토큰 보관 (Access는 메모리, Refresh는 httpOnly 쿠키 등)과 CORS
5. 실시간: SSE / WebSocket
6. 차트 라이브러리 (캔들, 장부 비교, jev 보정 그래프)
7. 화면 목록과 마일스톤 매핑 (M1 로그인·잔고 → M2 차트 → M3 주문 → M4 리스크·킬 스위치 → M5 판단 기록·장부 비교)

### 조사할 것
- 후보 프레임워크·차트 라이브러리의 현재 버전과 유지 상태
- Spring Boot 4 + SPA 조합에서 Refresh Token 쿠키 처리 방식

### 완료 기준
- 1~7이 결정 또는 제안으로 적혀 있고, 화면 목록이 마일스톤과 연결돼 있다
- 인증 방식이 바뀌었다면 plan.md 3.1과 데이터 모델(`refresh_tokens`)도 맞췄다

### 진행 메모
(없음)

---

## B-02 KIS API 검증 계획

- 브랜치: `plan/B-02-kis-verification`
- **선행 (사용자)**: KIS 모의투자 신청, KIS Developers에서 모의투자 앱키·시크릿 발급. 키는 대화에 붙여 넣지 말고 로컬 `.env`에만 둔다
- 목표: plan.md 8장·strategy.md 19장의 KIS 확인 항목을 실제 호출로 확인하고 결과를 문서에 남긴다
- 산출물: `docs/planning/kis-verification.md`(항목별 결과 표), plan.md 8장·strategy.md 19장 체크 갱신, 결과에 따라 바뀌는 절 수정

### 읽을 것
- plan.md 3.2(계좌 수명), 3.3(시세), 3.4(주문·모의 제약), 3.11(해외·선물), 8장
- strategy.md 15장(모의투자 제약), 19장

### 확인할 항목 (우선순위 순)
1. 토큰 발급·유효 시간·발급 횟수 제한, 모의 서버 호출 한도(초당 2회로 알려짐)
2. 국내 시세 조회, 실시간 WebSocket(체결가), **체결통보가 모의에서 오는지**
3. 모의 주문 체결 규칙: 현재가보다 유리한 지정가가 즉시 체결되는지, 체결량 제한, 부분 체결, 시간외 주문 거부, 장 시작 동시호가 주문
4. 해외주식 시세(모의 키로 조회 가능?, 실시간/지연, 지수 자체 제공?)
5. 국내선물 야간장 시세, 해외선물(CME ES·NQ) 시세 신청과 비용
6. NXT 시세·주문 구분 방법
7. 환율·금리·VIX 제공 여부
8. 뉴스·투자의견(목표가) API 제공 여부

### 정할 것
- 검증 스크립트를 무엇으로 쓸지 (임시 스크립트 / Kotlin으로 M1 어댑터의 시작점으로 쓸지). 앱 코드와 분리된 `scripts/kis-probe/` 제안
- 결과에 따라 바뀌는 설계 (예: 체결통보가 없으면 주기 조회만, 해외 시세가 없으면 FRED 등)

### 지켜야 할 것
- 모의 키만 쓴다. 실전 키를 쓰지 않는다
- 키·계좌번호를 로그·문서·커밋에 남기지 않는다. `.env`는 `.gitignore`에 있다
- 주문 검증은 정규장에, 소량으로

### 완료 기준
- 1~8 각각 "확인됨 / 안 됨 / 확인 불가(이유)"와 근거(응답 요약 또는 공식 문서 링크)가 표에 있다
- 결과로 바뀐 설계가 해당 문서에 반영됐다

### 진행 메모
(없음)

---

## B-13 마켓플레이스 GitHub 업로드

- 작업 위치: `~/Documents/claude-plugins` 저장소 (stock이 아님. 기획 브랜치 대신 그 저장소의 `chore:` 작업)
- 선행 (사용자): 저장소 이름(제안: `claude-plugins`), 공개 범위(private 권장) 결정
- 할 일
  1. `gh repo create loading1031/<이름> --private --source ~/Documents/claude-plugins --push` (외부 업로드라 실행 전 확인)
  2. 마켓플레이스를 GitHub 소스로 다시 등록: `claude plugin marketplace remove loading1031-plugins` → `claude plugin marketplace add loading1031/<이름>`
  3. stock에서 `claude plugin list`로 두 플러그인이 다시 enabled인지 확인
  4. stock `CLAUDE.md` "플러그인" 절의 마켓플레이스 위치 갱신, backlog B-13 완료
- 완료 기준: 다른 디렉터리에서 GitHub 소스로 설치가 된다

## B-14 kopring 원본 정리

- 작업 위치: `~/Documents/claude-plugins`, kopring-conventions 저장소
- 문제: 같은 규칙이 kopring-conventions(`.claude/rules`)와 플러그인(`skills/`)에 두 벌 있다
- 선택지 (사용자 결정)
  - A. kopring-conventions 저장소 자체를 플러그인 구조로 바꾸고, 마켓플레이스는 `github` 소스로 그 저장소를 참조
  - B. 플러그인을 원본으로 삼고, kopring-conventions에는 문서와 예시(`examples/`)만 남기며 README에 플러그인 설치 안내
- 선행: B-13
- 완료 기준: 규칙 원본이 한 곳이고, 다른 곳은 그것을 가리킨다

## 동기화 세션 (선택)

- 브랜치: `plan/sync-visual`
- backlog.md "동기화 빚" 4건을 시각화 문서에 반영한다. 다이어그램마다 스크린샷으로 렌더링 확인
- 완료 기준: 동기화 빚 0건
