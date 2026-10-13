# 자동매매 플랫폼 기획

- 작성일: 2026-10-10
- 상태: 초안 (검토 중)

## 1. 목표

증권사 API에 연결해 **사용자가 정한 전략으로 자동 매매**하는 개인용 플랫폼을 만든다.

| 운영 시기 | 목표 | 판단 기준 |
|---|---|---|
| 모의 운영 | 한국투자증권(KIS) **모의투자** 계좌로 수동 주문, 자동 주문, 손익 확인까지 끝까지 동작 | 전략 하나가 한 달 동안 사람 개입 없이 돌아가고, 증권사 잔고와 내부 잔고가 어긋나지 않음 |
| 실전 운영 | 같은 코드로 KIS **실전** 계좌 연결 | 리스크 한도와 킬 스위치를 검증한 뒤에만 실전 모드 허용 |
| 확장 | 두 번째 증권사 연결 | 증권사를 추가할 때 주문·전략 코드를 고치지 않음 |

이 문서에서 "운영 시기"는 위 세 가지를, 개발 순서(7장)는 마일스톤 M0~M7을 가리킨다. "단계"라는 말은 쓰지 않는다.

범위에서 뺀 것:

- 다른 사람에게 서비스하기(다중 사용자 과금, 투자자문 규제). 로컬 단독 사용을 전제로 한다. 받은 시세를 남에게 보여 주면 시세 재분배에 해당해 코스콤과 정보이용계약이 필요하다.
- 고빈도 매매. 모의투자 API 호출 한도가 낮아 분·일 단위 전략만 다룬다.
- 캐시(Redis), 메시지 브로커(Kafka). 필요해지면 도입한다(6장).

## 2. 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 언어 / JDK | Kotlin 2.3 이상 / JDK 25 (LTS) | Kotlin 2.3부터 JVM 25 바이트코드 지원 |
| 프레임워크 | Spring Boot 4.1.x | Spring Framework 7, Security 7, Hibernate 7.4, Jackson 3. 4.1.1 기준 실측 버전은 [m0-foundation.md](m0-foundation.md) |
| 빌드 | Gradle 9.1 이상 (Kotlin DSL) | Gradle 9.1부터 JDK 25 지원 |
| RDB | PostgreSQL | 인증, 계좌, 주문, 체결, 원장 |
| 시계열 | TimescaleDB (Postgres 확장) | 시세, 캔들. RDB와 같은 인스턴스 |
| 영속성 | Spring Data JPA + Kotlin JDSL (RDB), `JdbcClient` (시계열. 일괄 삽입만 `NamedParameterJdbcTemplate`) | 4.3절 |
| 증권사 API | KIS Developers REST + WebSocket | `@HttpExchange` HTTP Service Client |
| 프론트엔드 | 별도 SPA (미정) | REST + WebSocket/SSE |
| 로컬 실행 | Docker Compose (TimescaleDB 이미지) | |
| 에디터 | Zed + Claude Code | kopring-conventions 적용 |

## 3. 기능 범위

### 3.1 인증 (auth)

- 회원가입, 로그인, 로그아웃. 비밀번호는 BCrypt(또는 Argon2)로 해시한다.
- 프론트엔드가 별도 SPA이므로 **짧은 Access Token(JWT) + Postgres에 저장하는 Refresh Token**으로 한다. Refresh Token은 회전시키고, 로그아웃하면 폐기한다.
- 권한: `USER`, `ADMIN`. 혼자 쓰더라도 실전 모드 전환 같은 위험한 작업은 `ADMIN`만 하게 나눠 둔다.

### 3.2 증권사 계좌 연결 (brokerage)

- 사용자가 증권사 계좌를 등록한다: 증권사, 환경(`PAPER`/`LIVE`), 계좌번호, App Key, App Secret.
- App Key/Secret과 계좌번호는 **DB에 암호화해서 저장**하고(마스터 키는 환경 변수), 로그와 API 응답에서 가린다.
- 증권사 접근 토큰은 내부에서 발급·갱신한다. KIS 토큰은 24시간 유효하다고 알려져 있다(**검증하지 않음**). 토큰 발급 횟수 제한도 확인이 필요하다.
- 계좌 하나에 환경은 하나다. 모의투자와 실전은 도메인, 키, 거래 ID가 다르므로 **같은 계좌 레코드에서 환경만 바꿀 수 없게** 한다.
- **모의 계좌의 수명.** 모의투자는 신청할 때 참가 기간을 고르고, 끝나면 재신청해야 한다. 신청 후 3개월 동안 접속하지 않으면 해지된다. 초기화를 신청하면 다음 날 장 전에 처음 상태로 돌아간다.
    - 계좌 정보에 만료일을 저장하고, 만료 2주 전에 알린다.
    - 재신청으로 계좌번호나 API 키가 바뀌면 같은 계좌의 새 구간으로 등록한다(성과 구간: [strategy.md](strategy.md) 15장).
    - API 호출이 "접속"으로 인정되는지 확인 전까지 월 1회 앱 직접 접속을 알림으로 상기시킨다.
    - 토큰 발급이 실패하면 즉시 알린다. 해지·만료의 첫 증상일 가능성이 높다.

### 3.3 시세 (market)

시세의 원천은 거래소(KRX, 그리고 2025-03 개장한 대체거래소 NXT)이고, 코스콤이 증권사에 분배한다. 개인은 원천 피드를 받을 수 없으므로 아래 경로를 조합한다.

| 용도 | 소스 | 비고 |
|---|---|---|
| 실시간 시세 | 증권사 API (모의 운영: KIS WebSocket) | 증권사가 자기 계약 범위에서 재제공하는 데이터 |
| 과거 일봉 백필 | KRX Open API | 날짜별 전 종목 스냅샷. API 키 + 엔드포인트별 신청 |
| 분봉 | 증권사 API 조회 + 실시간 체결 집계 | 조회 기간 제한 확인 필요 |
| 종목 마스터 | KRX Open API 또는 증권사 종목 파일 | |

- **시세 소스와 주문 증권사를 분리한다.** 시세 포트(`LoadCandlesPort`, `QuoteStreamPort`)와 주문 포트(`PlaceOrderPort`)는 별개이고, 각각의 구현 선택도 `config`에서 따로 한다. 예: 시세는 KIS, 백필은 KRX, 주문은 다른 증권사.
- 종목 마스터(코드, 이름, 시장, 호가 단위, NXT 거래 대상 여부)를 저장한다. NXT 대상 종목은 고정돼 있지 않으므로 주기적으로 갱신한다.
- 관심 종목의 실시간 체결가는 프론트엔드에 SSE/WebSocket으로 중계한다.
- 분봉·일봉 캔들을 TimescaleDB hypertable에 저장한다. 캔들에는 시장 구분(KRX / NXT / 통합)을 둔다.
- 장 운영 캘린더는 **시장과 세션 단위**로 둔다. 기준 시간대는 `Asia/Seoul`이다.

| 시장 | 세션 | 시간 | 비고 |
|---|---|---|---|
| NXT | 프리마켓 | 08:00 ~ 08:50 | 지정가만 |
| KRX | 정규장 | 09:00 ~ 15:30 | 장 마감 시 미체결 주문 취소 |
| NXT | 메인마켓 | 09:00:30 ~ 15:20 | |
| NXT | 애프터마켓 | 15:40 ~ 20:00 (15:30부터 접수) | 지정가만. 미체결 지정가는 애프터마켓까지 유지 |
| KRX | 애프터마켓 | 확인 필요 | 2026년 개설 보도 있음 |

세션 시간은 증권사 안내와 보도 기준이며, 바뀔 수 있으므로 코드에 하드코딩하지 않고 설정으로 둔다.

### 3.4 주문 (order)

- 수동 주문: 프론트엔드에서 매수, 매도, 정정, 취소. 지정가와 시장가.
- 주문에 집행 시장을 둔다: `KRX`, `NXT`, `SOR`(증권사가 유리한 시장으로 라우팅). 어느 시장에서 산 주식이든 같은 주식이므로 보유 수량은 시장과 무관하게 하나로 관리한다. 결제는 두 시장 모두 T+2이고 예탁결제원이 통합 처리한다.
- 프리·애프터마켓에서는 지정가만 허용한다. KIS API가 NXT·SOR 주문을 어떻게 구분하는지는 확인 필요.
- **모의투자의 제약** (2차 자료 기준, M0에서 실측): 시간외 거래 불가, 주문 유형은 지정가·시장가·최유리·최우선만, 지정가는 실제 시장에서 그 가격에 체결이 생겨야 실제 체결량만큼만 체결된다. 그래서 모의 운영은 **정규장 + 지정가·시장가만** 쓰고, NXT·시간외·IOC/FOK는 실전 운영 초기에 처음 검증한다.
- 자동 주문: 전략이 낸 신호가 리스크 검사를 통과하면 주문한다(3.6).
- 주문 상태 머신:

```
CREATED ─(리스크 통과)→ SUBMITTING ─(증권사 접수)→ ACCEPTED ─→ PARTIALLY_FILLED ─→ FILLED
   │                       │                          │                │
   └→ REJECTED(리스크)      └→ FAILED(전송 실패/불명)   └→ CANCELLED     └→ CANCELLED(잔량)
```

- 주문마다 내부 `clientOrderId`(멱등 키)를 둔다. 증권사 주문번호와 짝지어 저장한다.
- **증권사 호출이 타임아웃되면 재전송하지 않는다.** 상태를 `UNKNOWN`으로 두고 주문 조회 API로 실제 상태를 확인한다(3.8 대사).
- 체결은 체결통보(WebSocket)와 주기적 조회 두 경로로 받고, 체결 ID로 중복을 막는다.

### 3.5 포트폴리오 (portfolio)

- 보유 종목(수량, 평균단가), 현금, 평가손익, 실현손익.
- 현금 변동은 **원장(ledger)에 추가만** 하고, 잔고는 원장에서 계산하거나 원장과 같은 트랜잭션에서 갱신한다.
- 수수료와 세금을 체결 단위로 기록한다. 요율은 코드에 두지 않고 계좌 환경별 설정값으로 둔다. 모의투자는 수수료 0.0142%, 세금 0.20%로 알려져 있다(**검증하지 않음**). 실제 계산은 증권사 체결 내역의 값을 우선한다.

### 3.6 전략과 자동매매 (strategy)

운영 전략의 상세는 **[strategy.md](strategy.md)**에 있다. 요약:

- 아침 파이프라인: 미국장 마감 → 07:00 리포트(코드 계산) → 08:40 jev 판단 → 08:45 결정 → 09:00 주문. 장중에는 강제 청산 규칙만 감시한다.
- jev(Ollama 결정 모델)는 매수 필터, 보유 종목 재평가, 뉴스 분류에만 쓴다. 숫자(지표, 목표 주가, 수량)는 코드가 계산한다.
- 매수는 며칠에 걸친 **포지션 계획**(분할 회차, 무효화 가격, 목표 주가, 만료)으로 실행한다. 계획에 없는 추가 매수는 거부한다.
- 위험 예산은 고정 상한 × 시장 국면 배수. 매도는 강제 청산 규칙이 우선이고 jev는 앞당기기만 한다.
- jev는 단순 규칙 기준선과 나란히 운용해, 이길 때만 쓴다.
- 전략 판단 로직은 **`domain`의 순수 함수**로 만들어 시세 소스와 분리한다. 그래야 백테스트와 실거래가 같은 코드를 쓴다.
- 상태: `DRAFT` → `BACKTESTED` → `PAPER_RUNNING` → `LIVE_RUNNING`. 실전으로 가려면 모의 운용을 거쳐야 한다.

### 3.7 리스크 관리 (risk)

모든 자동 주문은 리스크 검사를 거친다. 수동 주문도 같은 검사를 쓰되, 일부 한도는 경고만 한다.

| 규칙 | 예 |
|---|---|
| 종목당 최대 비중 | 평가금액의 20% |
| 주문당 최대 금액 | 100만 원 |
| 일일 손실 한도 | 넘으면 그날 자동매매 정지 |
| 주문 빈도 | 증권사 호출 한도 안에서. 모의투자는 초당 2회로 알려져 있음(**검증하지 않음**) |
| 거래 가능 시간 | 기본은 정규장만 자동 주문 허용. 프리·애프터마켓 자동 주문은 전략별로 명시적으로 켜며, 모의 계좌에서는 켤 수 없다 |
| **킬 스위치** | 버튼 하나로 모든 전략 정지 + 미체결 주문 취소 |

### 3.8 대사(reconciliation)

- 장 시작 전과 장 마감 후에 증권사 잔고·미체결·체결 내역을 조회해 내부 상태와 맞춰 본다.
- 어긋나면 **증권사 쪽을 정답으로 보고** 내부를 보정한다. 보정 내역은 기록하고 알린다.
- `UNKNOWN` 주문도 여기서 확정한다.
- **계좌 리셋 판정.** 불일치가 기준(예: 총자산의 5% 또는 보유 종목 수 불일치)을 넘으면 단순 보정하지 않는다. 모의 계좌의 초기화·해지·재신청으로 보고, 자동매매를 멈추고 알린다. 성과는 그 지점에서 새 구간으로 시작하고, 사람이 확인한 뒤 재개한다([strategy.md](strategy.md) 15장).

### 3.9 백테스트 (backtest)

- 저장된 캔들로 전략을 재생한다. 체결 모델(다음 봉 시가, 슬리피지, 수수료)을 설정할 수 있다.
- 모의투자 성과는 실전보다 좋게 나온다(호가 대기열 무시, 시장 충격 없음, 실패 상황 적음). 그래서 기본 체결 모델은 **모의투자보다 보수적으로** 둔다: 지정가는 봉 안에서 가격을 "통과"했을 때만 체결, 시장가는 다음 봉 시가 + 슬리피지, 체결 수량은 봉 거래량의 일정 비율 이하.
- 실전 운영에서는 **슬리피지**(판단 시점 가격 대비 실제 체결가 차이)를 주문마다 기록하고, 백테스트의 슬리피지 가정을 이 실측값으로 보정한다.
- 결과: 수익률, MDD, 승률, 거래 내역. 결과는 저장해 전략 상태 전이(3.6)의 근거로 쓴다.

### 3.10 프론트엔드 API

- REST: `/api/v1/...`. Spring Boot 4의 API 버전 기능을 쓴다.
- 실시간: 시세, 주문 상태, 체결 알림을 WebSocket(또는 SSE)으로 보낸다.
- 화면: 로그인, 계좌 연결, 대시보드(잔고·손익), 종목 차트, 주문, 전략 목록·설정, 백테스트 결과, 리스크 설정, 킬 스위치.

### 3.11 해외·선물 지표 (global)

거래하지 않고 **분석과 전략 입력에만** 쓰는 데이터다. 소스는 **KIS Open API 하나로 통일**한다(해외주식 시세, 국내·해외 선물옵션 시세). 부족한 것만 나중에 다른 소스를 붙인다.

| 지표 | 예 | KIS 상품 영역 | 갱신 |
|---|---|---|---|
| 미국 지수·종목 | SOX 구성 종목, NVDA, MU, EWY(MSCI Korea ETF) | 해외주식 | 일봉 (07:00 KST 배치) |
| 미국 지수 선물 | S&P 500(ES), 나스닥 100(NQ) — CME | 해외선물 | 장중 실시간 또는 분봉. 한국 정규장 시간에도 거래돼 실시간 미국 심리를 보여 줌 |
| KOSPI200 선물 | 주간 09:00~15:45, **KRX 야간 18:00~06:00** (2025-06부터 KRX 자체 운영) | 국내선물 | 야간장 종가 = 다음 날 아침 갭 예측 지표 |
| 환율·금리·변동성 | 원/달러, 미국 10년물, VIX | KIS에서 확인 필요. 없으면 FRED | 일별 |

- 지수 자체(SOX, S&P 500 지수)를 KIS에서 받을 수 없으면 대표 ETF나 지수 선물로 대신한다.
- **선물은 만기가 있다.** 월물이 바뀔 때마다 가격이 끊기므로, 근월물을 이어 붙인 연속 시계열을 만들고 롤오버 규칙(만기 며칠 전 교체)을 정해 둔다. 원 월물 시계열도 함께 저장한다.
- **야간 선물의 거래일은 끝나는 날 기준**이다. 18:00에 시작한 세션은 다음 날 날짜로 저장한다.
- **`available_at`(받을 수 있었던 시각)을 모든 값에 저장한다.** 백테스트와 전략은 판단 시점 이전에 `available_at`이 찍힌 값만 쓴다(미래 데이터 엿보기 방지).
- 시간대: 저장은 UTC. 미국장 마감은 서머타임에 따라 05:00 또는 06:00 KST로 바뀌므로, 미국 거래일 → 반영되는 한국 거래일 매핑은 양국 시장 캘린더로 계산한다.
- 해외선물 시세는 거래소별로 시세 신청이 필요하다. CME는 무료로 안내돼 있다(KIS 수수료 안내 기준, 확인 필요).

## 4. 아키텍처

### 4.1 "JPA vs 이벤트 드리븐"은 둘 중 하나를 고르는 문제가 아니다

- **JPA는 상태를 저장하는 방법**이고, **이벤트 드리븐은 구성 요소끼리 소통하는 방법**이다. 대부분의 이벤트 드리븐 시스템도 상태는 JPA 같은 저장소에 둔다.
- **여러 증권사를 붙이는 확장성은 이벤트 드리븐이 아니라 포트·어댑터에서 나온다.** 주문 서비스가 `PlaceOrderPort`만 알고, 증권사마다 어댑터(`KisOrderAdapter`, `XxxOrderAdapter`)를 두면 증권사를 추가해도 주문 코드를 고치지 않는다.
- 이벤트 드리븐이 실제로 필요한 곳은 **비동기로 들어오는 사실**이다. 체결통보, 실시간 시세, 봉 마감, 주문 상태 변화가 그렇다. 이것들은 처음부터 이벤트로 다룬다.

### 4.2 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 배포 단위 | **모듈러 모놀리스** (기능 우선 패키지) | 로컬 단독 사용. 서비스를 쪼갤 이유가 없다 |
| 구조 | **out 포트 헥사고날** (kopring-conventions) | 증권사 외부 API와 시계열 DB가 있어 포트의 이점이 크다 |
| 상태 저장 | **JPA + Kotlin JDSL** | 주문, 계좌, 원장은 트랜잭션과 제약 조건이 중요한 데이터다 |
| 모듈 간 소통 | **Spring 내부 이벤트** (`@TransactionalEventListener(AFTER_COMMIT)`) | 주문 체결 → 포트폴리오 갱신 → 알림을 서로 모르게 연결 |
| 유실되면 안 되는 이벤트 | **Spring Modulith 이벤트 발행 기록** (JDBC, Postgres). 2026-10-13 Postgres Outbox 직접 구현에서 변경 | 체결 반영처럼 유실되면 잔고가 틀어지는 흐름. 업무 트랜잭션 안에 기록되고, 리스너가 실패하면 미완료로 남아 재전송한다. Outbox·릴레이를 직접 만들지 않는다 ([m0-foundation.md](m0-foundation.md)) |
| 메시지 브로커 | **지금은 도입하지 않음** | 프로세스가 하나다. 서비스를 나누게 되면 이벤트 기록을 Kafka로 내보낸다(Modulith `@Externalized`) |
| 이벤트 소싱 | **도입하지 않음** | 주문 상태 이력(`order_events`)과 원장으로 감사 추적은 충분하다 |

이렇게 하면 나중에 브로커를 도입하더라도 **이벤트 클래스와 리스너 구조는 그대로**이고, 발행 어댑터만 바뀐다.

### 4.3 영속성 도구

| 데이터 | 도구 | 이유 |
|---|---|---|
| 사용자, 계좌, 주문, 체결, 원장, 전략 | Spring Data JPA + Kotlin JDSL | 컨벤션 기본값 |
| 캔들, 체결 시세 (hypertable) | `JdbcClient` + SQL. 일괄 삽입은 `NamedParameterJdbcTemplate.batchUpdate` + `ON CONFLICT DO NOTHING` | `time_bucket` 같은 TimescaleDB 함수는 JPQL로 표현할 수 없다. Kotlin JDSL은 **JPQL만** 지원한다. Spring 7.0의 `JdbcClient`에는 배치가 없다(7.1에 추가 예정). JPA 쓰기, Exposed, jOOQ를 비교한 결과는 [m0-foundation.md](m0-foundation.md) |

`adapter/out/timeseries`에서 SQL을 쓰는 것은 컨벤션의 "네이티브 SQL 금지"에 대한 **명시적 예외**로 둔다. 이 예외는 이 패키지에만 적용한다. `JdbcClient`·`JdbcTemplate`은 kopring 훅이 `adapter/out`·`config` 밖에서 막는다(`arch/tech-client-outside-adapter`).

### 4.4 Kotlin JDSL 커스텀 DSL

JDSL은 `Jpql`을 상속해 자기만의 DSL 함수를 추가할 수 있다(`class MyJpql : Jpql()` + `JpqlDsl.Constructor`).

| 상황 | 판단 |
|---|---|
| Repository 확장 함수로 쿼리 작성 (`fun OrderRepository.findOpen(...)`) | **기본.** 컨벤션 예시가 이 방식 |
| 같은 조건이 3곳 이상 반복 (`ownedBy(userId)`, `inEnvironment(PAPER)`) | 그때 `TradingJpql`을 만들어 옮긴다 |
| value class(`Money`, `Quantity`) 비교를 짧게 쓰는 헬퍼 | 반복되면 위와 같이 |
| TimescaleDB 함수를 JPQL로 감싸기 (Hibernate 함수 등록 + `JpqlSerializer`) | **과설계.** `JdbcClient`로 SQL을 쓴다 |
| 범용 쿼리 빌더·동적 검색 프레임워크 | **과설계** |

처음부터 커스텀 DSL을 만들지 않는다. 반복이 보이면 그때 추출한다.

### 4.5 패키지 구조

```
com.<base>
├── auth/          domain/ application/ adapter/
├── brokerage/     계좌 연결, 토큰, 증권사 어댑터(adapter/out/external/kis)
├── market/        종목, 시세, 캔들(adapter/out/timeseries), 장 캘린더
├── global/        해외 주식·선물·거시 지표 (읽기 전용, 거래 안 함)
├── order/         주문, 체결, 상태 머신
├── portfolio/     보유, 원장, 손익
├── strategy/      전략, 실행, 백테스트
├── risk/          리스크 규칙, 킬 스위치
├── reconciliation/
└── config/        공통 Config (Dispatcher, Scope, Security, Jackson)
```

- 포트는 쓰는 쪽 기능이 가진다. 예: `order/application/port/out/PlaceOrderPort`
- 증권사 어댑터는 `brokerage/adapter/out/external/<증권사>`에 모으고, 여러 기능의 포트를 구현한다.
- 증권사 선택은 `config`의 라우팅 빈이 계좌의 증권사 종류를 보고 정한다(`di/selection-in-config-only`).
- **기능 사이 의존** (2026-10-13 결정): 다른 기능은 두 곳에서만 참조한다. `adapter/out`은 부르는 쪽 포트를 구현하며 상대의 `application/service`를 호출하고, `adapter/in/messaging` 리스너는 상대의 `domain/event`를 받는다. 기능 간 순환은 금지하고, 반대 방향으로 알릴 때는 이벤트를 쓴다. ArchUnit으로 검사한다([m0-foundation.md](m0-foundation.md)).

### 4.6 주문 흐름

```
[전략 신호] or [프론트 주문]
   → OrderService.place()            @Transactional: Order(CREATED) 저장, 리스크 검사
   → (커밋 후) OrderSubmitter        PlaceOrderPort → KIS 어댑터 → 증권사
   → ACCEPTED / FAILED / UNKNOWN 저장
[체결통보 WebSocket] or [주기 조회]
   → ExecutionService.record()       계좌 잠금, 체결 ID로 중복 제거, Order 상태 갱신, OrderFilled 발행(이벤트 기록)
   → (커밋 후) 리스너 → PortfolioService(원장·보유 갱신), 알림, 전략 상태
```

**주문·체결 흐름의 정합성 (2026-10-13)** — KIS 공식 예제 코드의 필드 정의와, 실험 프로젝트에서 재현한 PostgreSQL 동작을 바탕으로 했다.

KIS가 주는 정보 ([open-trading-api](https://github.com/koreainvestment/open-trading-api) `examples_llm/domestic_stock`, 2026-10-08 갱신본 기준):

| 경로 | 주는 것 | 없는 것 |
|---|---|---|
| 실시간 체결통보 `H0STCNI0`(모의 `H0STCNI9`) | 주문번호 `ODER_NO`, 원주문번호 `OODER_NO`, 이번 체결 수량·단가, 체결 시각(초 단위), `CNTG_YN`(1 = 접수·정정·취소·거부, 2 = 체결) | 체결 하나하나의 고유 번호 |
| 주기 조회: 주식일별주문체결조회 `inquire-daily-ccld`(모의 `VTTC0081R`) | **주문별 합계**: 총 체결 수량 `tot_ccld_qty`, 총 체결 금액 `tot_ccld_amt`, 평균가 `avg_prvs`, 추정 제비용 | 개별 체결 내역. 모의는 한 번에 15건 |

주문번호는 주문 하나의 번호다. 주문 하나가 여러 번, 여러 가격에 나눠 체결되면 그 체결들은 같은 주문번호로 온다.

결정:
- **통보는 전부 저장한다.** 접수·정정·취소·거부·체결을 받은 그대로, 추가만 한다. 처리와 상관없이 먼저 저장하고 커밋한다.
- **기록은 "이 시점 주문의 누적 상태"로 저장한다.** 상태, 누적 체결 수량, 누적 체결 금액. 통보를 놓쳐도 역산하지 않는다. 가장 마지막 기록이 그 주문의 현재 상태다.
- **동기화:** 오래 상태가 안 바뀐 주문과 장 마감 뒤 그날 주문 전체를 주기 조회로 확인하고, KIS가 준 누계를 그대로 기록한다.
- **금액 원장은 끝난 주문만 받는다.** 끝난 주문 1건 = 금액 원장 1건, 최종 누적 금액 그대로. 진행 중에는 매수 금액·매도 수량을 **묶기만 하고 차감하지 않는다.**
- **매도 가능 수량과 주문 가능 금액은 누적 상태 기록과 묶음으로 계산한다.** 금액 원장을 기다리지 않는다.
- **순서:** 한 주문 안의 체결은 모두 같은 방향이라 반영 순서가 결과를 바꾸지 않는다. 금액 원장의 순서는 주문이 끝난 순서다. 같은 종목의 매수·매도 사이에서 달라질 수 있는 실현 손익은 KIS 잔고와 대사한다.
- 거래 기록은 절대 삭제할 수 없게 보장한다.
- 외부 시스템이 붙인 식별자 칼럼은 모두 `external_id`로 부른다. 그 값을 멱등키(`UNIQUE`)로 쓸지는 테이블마다 정한다.

처리 흐름:

```
주문 접수      → 매수는 금액, 매도는 수량을 묶음 (차감 안 함)
통보 수신      → 계좌 잠금 → 누적 상태 기록 INSERT (출처: 통보) → COMMIT
주기 조회      → 계좌 잠금 → KIS 누계가 마지막 기록과 다르면 누적 상태 기록 INSERT (출처: 조회) → COMMIT
주문이 끝남    → (리스너) 최종 누적값으로 금액 원장 1건 + 보유 갱신 + 묶음 해제 → COMMIT
```

| 장치 (제안) | 막는 것 |
|---|---|
| 누적 상태 기록은 별도 빈의 `@Transactional(propagation = REQUIRES_NEW)`로 먼저 커밋 | 뒤 처리의 실패로 기록까지 사라지는 것. PostgreSQL에는 자율 트랜잭션이 없어서, 같은 트랜잭션 안의 행은 롤백되면 반드시 사라진다 |
| 각 기록에 출처(통보 / 조회). 조회값이 정답. 조회 누계가 통보로 쌓은 누계보다 작으면 알림 | 통보 중복으로 우리 누계가 부풀어도 조회로 바로잡는다 |
| 조회 기록은 `UNIQUE(주문, 누적 수량, 출처)` 등으로 같은 누계를 두 번 넣지 않음 | 같은 조회 결과의 중복 저장 |
| 주문·기록 저장 때 계좌 행 잠금(`SELECT … FOR UPDATE`). 잠금은 별도 문장으로 먼저 걸고, 조회·저장은 그다음 문장에서 | 동시 주문으로 돈을 두 번 쓰는 것, 기록 id 순서와 커밋 순서가 어긋나는 것 |
| 금액 원장 `UNIQUE(type, ref_id)`, `ref_id` = 주문 | 끝난 주문이 두 번 반영되는 것 |
| 금액 원장에는 성공한 돈의 움직임만. 반영 실패는 주문의 원장 반영 상태에 원인과 함께 기록하고, 그 계좌의 반영을 멈추고 알림 | 잔고 합계에 실패 기록이 섞이는 것, 실패를 건너뛰고 계속 가는 것 |
| 삭제 금지: `BEFORE DELETE`(행)·`BEFORE TRUNCATE`(문장) 트리거, 앱 계정에는 `SELECT`·`INSERT`와 필요한 상태 칼럼 `UPDATE`만, Flyway 계정과 앱 계정 분리 | 기록 변조와 삭제. 트리거는 테이블 소유자도 막고, 권한은 소유자에게 안 먹히므로 계정을 나눈다 |
| 장 마감 뒤 대사(KIS 주문별 누계·잔고 ↔ 우리 기록) | 저장 자체가 안 된 주문, 실현 손익 차이 |

- 묶을 금액: 지정가 매수는 지정가 × 수량. 시장가 매수는 체결가를 미리 모르므로 KIS의 주문 가능 금액 계산 방식을 확인한 뒤 정한다(8장).
- 확인한 PostgreSQL 동작
  - id는 `INSERT` 때 시퀀스에서 받고, 다른 트랜잭션에는 `COMMIT` 뒤에 보인다. 잠금 없이 "마지막으로 본 id 이후"를 읽으면 늦게 커밋된 작은 id를 건너뛴다.
  - 시퀀스 번호는 되돌아가지 않는다. 롤백뿐 아니라 `ON CONFLICT DO NOTHING`으로 건너뛴 `INSERT`도 번호를 쓴다(넣을 행을 기본값 `nextval`까지 채운 뒤에 고유 키를 검사한다). 결번은 정상 운영 중에도 생기며, 어떤 처리도 결번에 기대지 않는다.
  - `INSERT`는 같은 고유 키를 넣을 때만 서로 기다린다.
  - 잠금을 거는 문장 안에서 다른 테이블을 조회하면, 기다리기 전 스냅샷을 쓴다.
  - 칼럼 단위 `UPDATE` 권한과 `DELETE`·`TRUNCATE` 트리거가 동작한다.
- 거래 기록(order), 금액 원장(portfolio), 보유(portfolio)는 다른 테이블이다. 테이블 이름은 [backlog.md](backlog.md) B-17.

## 5. 데이터 모델 초안

| 테이블 | 핵심 컬럼 |
|---|---|
| `users` | id, email, password_hash, role |
| `refresh_tokens` | id, user_id, token_hash, expires_at, revoked_at |
| `broker_accounts` | id, user_id, broker(`KIS`), environment(`PAPER`/`LIVE`), account_no_enc, app_key_enc, app_secret_enc, expires_on(모의) |
| `instruments` | code, name, market(KOSPI/KOSDAQ), tick_size_rule, nxt_eligible |
| `market_sessions` | venue(KRX/NXT), session, opens_at, closes_at, order_types |
| `orders` | id, client_order_id(UK), account_id, instrument, side, type, venue(KRX/NXT/SOR), price, quantity, status, external_id(KIS 주문번호), strategy_run_id(nullable), version |
| `order_events` | id, order_id, from_status, to_status, reason, occurred_at |
| `executions` | 주문의 누적 상태 기록(4.6). id, account_id, order_id, event(접수/정정/취소/거부/체결/동기화), source(통보/조회), status, filled_qty(누적), filled_amount(누적), last_fill_qty·last_fill_price(통보일 때), fee·tax(추정), occurred_at, recorded_at. 추가만 함 |
| `order_holds` | 진행 중 주문의 묶음. order_id, account_id, 금액 또는 수량. 주문이 끝나면 해제 (4.6, 제안) |
| `positions` | account_id, instrument, quantity, avg_price, version. 끝난 주문으로 갱신 |
| `cash_ledger` | id, account_id, amount, type(`DEPOSIT`/`BUY`/`SELL`/`FEE`/`TAX`/`ADJUST`), ref_id(끝난 주문 등), occurred_at. `UNIQUE(type, ref_id)` |
| `strategies` / `strategy_runs` / `signals` | 전략 정의·파라미터, 실행 기록, 신호 |
| 전략 운영 테이블 | `position_plans`, `plan_tranches`, `decisions`, `news_articles` 등 — [strategy.md](strategy.md) 18장 |
| `risk_limits` | account_id, 규칙별 한도, kill_switch |
| `event_publication` | Spring Modulith 이벤트 발행 기록. 스키마는 Modulith가 정한다. DDL은 Flyway에 넣는다(제안) |
| `candles` (hypertable) | instrument, venue(KRX/NXT/통합), interval, bucket_start, open, high, low, close, volume |
| `global_series` | series_id(예: `US:NVDA`, `CME:ES`, `KRX:K200F-NIGHT`), source, kind(STOCK/FUTURE/MACRO), contract(월물, nullable), unit, timezone |
| `global_bars` (hypertable) | series_id, interval, observed_at, open, high, low, close, volume, **available_at** |
| `futures_rolls` | series_id, from_contract, to_contract, rolled_at |

- 금액·가격은 `numeric`(Kotlin `BigDecimal`)으로 저장하고, 도메인에서는 `Money`/`Price`/`Quantity` value class로 다룬다. `Double`을 쓰지 않는다.
- 외부 시스템이 붙인 식별자는 `external_id`로 부른다. 멱등키로 쓸지는 테이블마다 정한다.
- 시각은 `timestamptz`(UTC)로 저장하고, 장 시간 판단에만 `Asia/Seoul`을 쓴다. 현재 시각은 주입한 `Clock`에서 얻는다.
- 스키마 마이그레이션은 Flyway로 한다.

## 6. 나중에 도입할 것과 그 조건

| 대상 | 도입 조건 |
|---|---|
| Kafka | 전략 실행기나 시세 수집기를 별도 프로세스로 나눌 때 |
| Redis | 여러 인스턴스가 토큰·호출 한도를 공유해야 할 때 |
| CQRS 읽기 모델 | 대시보드 조회가 주문 처리 성능에 영향을 줄 때 |
| 두 번째 증권사 | 확장 시기. 해당 증권사 API의 모의투자 지원 여부를 먼저 확인 |

## 7. 개발 순서

| 마일스톤 | 내용 | 완료 기준 |
|---|---|---|
| M0 | Claude 설정(`/kopring:init`, 거래 규칙, 훅), Gradle, Docker Compose, Flyway, 컨텍스트 로딩 테스트, ArchUnit, 뮤테이션 테스트(PIT, 변경분 실행). 설계: [m0-foundation.md](m0-foundation.md) | `./gradlew test` 통과(ArchUnit 포함), 훅 동작, `pitestChanged`가 샘플 도메인 클래스에서 동작 |
| M1 | 인증(JWT + Refresh), 계좌 연결(암호화 저장), KIS 토큰 발급 | 프론트에서 로그인 후 모의 계좌 잔고 조회 |
| M2 | 종목 마스터, 시장·세션 캘린더, KRX Open API 일봉 백필, 분봉 수집, 실시간 시세 중계, 해외 일봉·지수 선물·KOSPI200 야간선물 수집 | 차트에 캔들 표시, 실시간 가격 갱신, 아침 07:00에 간밤 해외·야간선물 지표가 채워짐 |
| M3 | 수동 주문, 상태 머신, 체결 수신, 포트폴리오·원장, 이벤트 발행 기록(Modulith) | 모의 계좌에서 매수 → 체결 → 잔고 반영 |
| M4 | 대사, 리스크 규칙, 킬 스위치 | 일부러 상태를 어긋나게 한 뒤 대사로 복구 |
| M5 | 아침 파이프라인, 시장 국면, 포지션 계획·사이징, 강제 청산, 뉴스 수집, jev 판단, 기준선 가상 장부 | 모의 계좌에서 자동매매 1주 무중단, 모든 판단이 `decisions`에 기록됨 |
| M6 | 백테스트 | 같은 전략의 백테스트와 모의 운용 결과 비교 |
| M7 | 실전 모드, 슬리피지 기록, NXT·시간외 주문 검증 | [strategy.md](strategy.md) 16.3 실전 전환 기준 통과 후 소액 운용, 실측 슬리피지가 백테스트 가정 이내 |

## 8. 확인이 필요한 것

- [ ] KIS 모의투자 호출 한도(초당 2회로 알려짐), 토큰 유효 시간·발급 제한, 모의투자에서 쓸 수 없는 API 목록 — 공식 포털 문서로 확인
- [ ] KIS 체결통보 WebSocket이 모의투자에서도 동작하는지
- [x] KIS가 체결마다 고유한 번호를 주는지 — 주지 않는다(공식 예제 코드의 필드 정의 기준, 2026-10-13). 그래서 4.6은 주문별 누적 상태로 기록한다. 포털 문서와 실제 응답으로 B-02에서 재확인
- [ ] KIS가 같은 체결통보를 두 번 보내는지(재연결 등)
- [ ] 일별주문체결조회 `output1.tot_ccld_amt`가 주문의 총 체결 금액인지. 예제의 `output2` 필드 설명은 한 칸씩 밀려 보인다
- [ ] 수수료·세금 확정 값을 어느 API에서 받는지(조회는 추정치 `prsm_tlex_smtl`)
- [ ] 정정 주문의 체결이 새 주문번호와 원주문번호 중 어느 것으로 오는지
- [ ] 시장가 매수의 주문 가능 금액을 KIS가 어떻게 계산하는지(묶을 금액의 기준), 매도 대금을 언제부터 주문에 쓸 수 있는지(결제 시점)
- [ ] 모의투자의 수수료·세금 계산 방식 (0.0142% / 0.20%로 알려짐)
- [ ] 모의투자 체결 규칙 실측: 현재가보다 유리한 지정가가 즉시 체결되는지, 실제 체결량만큼만 체결되는지, 부분 체결과 체결통보가 오는지, 시간외 주문이 거부되는지
- [ ] 모의투자 참가 기간 선택지, 재신청 시 계좌번호·API 키 변경 여부, 3개월 미접속 기준에 API 호출 포함 여부, KIS Developers 모의 API 키 유효기간
- [ ] 프론트엔드 기술 (React/Vue 등)
- [ ] 과거 캔들 데이터 출처: KIS 조회 API의 기간 제한, KRX Open API 이용 약관(개인 사용 조건)
- [ ] KIS API의 NXT 시세 제공 여부, 주문 시 KRX/NXT/SOR 지정 방법, 모의투자에서 NXT·애프터마켓 지원 여부
- [ ] KRX 애프터마켓 운영 시간과 대상 (2026년 개설 보도)
- [ ] KIS 해외주식 시세: 모의투자 키로 조회 가능한지, 미국 시세가 실시간인지 지연인지, 이용료, 지수(SOX 등) 자체 제공 여부
- [ ] KIS 국내선물 API의 KRX 야간장 시세 지원 여부와 TR, KOSPI200 야간장 종료 시각(06:00으로 연장됐다는 자료와 05:00 자료가 엇갈림)
- [ ] KIS 해외선물(CME ES·NQ) 시세 신청 절차와 비용, 모의투자 지원 여부
- [ ] 환율·금리·VIX를 KIS에서 받을 수 있는지 (없으면 FRED)
- [ ] 토스증권 Open API(2026-08 정식 출시)의 모의투자 지원 여부, 실시간 스트림 지원 여부 — 두 번째 증권사 후보
- [x] Zed의 Kotlin LSP가 Kotlin 2.3 이상과 JDK 25에서 정상 동작하는지 — 2026-10-12 `kotlin-lsp` 263.6379.0으로 확인([m0-foundation.md](m0-foundation.md)). Zed 화면에서는 보지 않음
