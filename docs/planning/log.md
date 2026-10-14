# 기획 결정 이력

최신이 위. 형식은 planning 플러그인의 `rules` 스킬.

## 2026-10-14 decide | 프론트엔드 기술과 화면 목록 (B-03)
- 결정: Next.js(App Router, 서버 컴포넌트)를 BFF로 운영. 브라우저는 Next하고만 통신하고 Spring 호출은 모두 Next 서버가 한다. 같은 저장소 `frontend/`, shadcn/ui. 서버 렌더링(htmx)과 정적 내보내기는 고르지 않음 — SSE와 서버 컴포넌트 기반 서버 드리븐 UI가 목적
- 결정: 인증은 Next 세션(암호화된 httpOnly 쿠키) + Spring 서비스 키. 비밀번호 확인은 Spring, 사용자 ID·권한은 Next가 헤더로 전달. JWT·`refresh_tokens` 삭제, CORS 불필요. 로그인 시도 제한은 로컬 전용인 동안 두지 않음
- 결정: 실시간은 SSE(Spring → Next 라우트 핸들러 → 브라우저). 차트는 Lightweight Charts(캔들·실시간·매매 표시)와 Recharts(성과·평가). 차트는 클라이언트 컴포넌트, 데이터 조회·화면 구성은 서버 컴포넌트
- 결정: 화면 목록 M1~M7 매핑. 미체결 취소·정정은 주문 하나 단위, 일괄 취소 없음
- 변경: 킬 스위치는 강제 청산을 포함한 새 자동 주문만 막는다. 이미 낸 주문·보유 종목·포지션 계획은 그대로 두고, 누를 때 입력한 종목·방향의 미체결만 취소(기본 빈 목록). 이전 정의("모든 전략 정지 + 미체결 취소", strategy.md "전량 + 미체결 취소", 계획 `CANCELLED`)를 바꿈. 이유: 일괄 취소·청산은 급락 중 손절까지 지우고, 강제 청산 로직 자체가 잘못됐을 때도 멈출 수 있어야 함
- 바뀐 문서: frontend.md(새로), plan.md 2장·3.1·3.3·3.7·3.10·5장·7장·8장, strategy.md 0장 Mermaid·9.3·11.2·11.3, CLAUDE.md "결정된 사항"
- 남은 것: Next 세션 구현 방식, Node·패키지 매니저, 개발 실행 방법(frontend.md 확인 필요). 운영 시 Compose 구성은 B-22로. KIS WebSocket 세부는 B-02(#6 댓글). 시각화 문서는 동기화 빚

## 2026-10-14 decide | 작업지시서를 GitHub 이슈로 (B-18)
- 결정: 작업지시서는 항목마다 GitHub 이슈 하나(라벨 `plan`). 본문 = 지시서, 진행 메모 = 날짜별 댓글. 이슈는 지시서가 있는 항목만 만들고 나머지는 `pick`할 때 만든다
- 결정: 세션 시작·종료 체크리스트는 CLAUDE.md "기획 진행 방식", 권장 순서는 backlog.md 맨 위. backlog.md "후보" 표에 이슈 칸
- 결정: work-orders.md 삭제. 내용은 이슈 #5(B-03), #6(B-02), #7(B-14), #8(B-21)로 옮김. "동기화 세션"은 백로그 B-21로
- 플러그인: planning 0.5.0 (claude-plugins `2cb6bc7`), 설정 "작업지시서: issue | file", 파일 방식도 유지
- 바뀐 문서: CLAUDE.md 문서·기획 설정·기획 진행 방식·Git, backlog.md, m0-foundation.md 머리말, work-orders.md(삭제)

## 2026-10-13 update | 통합증거금과 미수 금지(제안)
- 확인: 한국투자증권 모의투자 안내 자료에 따르면 국내·해외를 한 계좌로 거래하고, 통합증거금으로 외화·해외 매도 대금까지 국내 매수에 쓸 수 있으며, 증거금률에 따라 주문 가능 금액이 현금보다 커진다(미수 → 반대매매)
- 제안: 리스크 규칙에 "미수 금지"(원화 현금 − 묶음을 상한으로). 해외 거래 범위는 B-20
- 바뀐 문서: plan.md 3.7·3.11·8장, backlog.md B-02·B-20, work-orders.md B-02

## 2026-10-13 decide | M0 설계 3차 (B-01 정할 것 7번 나머지, 8번)
- 결정: `main`에 합치는 방식은 `--no-ff` 머지 커밋(기획·코드 브랜치 모두)
- 결정: 컨텍스트 로딩 테스트는 `@SpringBootTest` + Testcontainers 설정 클래스 하나(앱 계정 접속까지 확인), 샘플 도메인은 `order/domain/TickSize`(호가 단위), ArchUnit은 규칙을 처음부터 모두 넣고 빈 대상은 허용
- 바뀐 문서: m0-foundation.md 결정 사항·"M0 구현 체크리스트"(상태: 확정), CLAUDE.md "코드 작업" 절 초안
- 남은 것: KRX 호가 단위 구간과 ArchUnit 설정 기본값은 M0 구현 전에 확인

## 2026-10-13 update | 주문·체결 정합성 보완 (검토 반영)
- 결정: 금액 원장은 끝난 주문 1건당 **유형별 1행**(대금·수수료·세금). 확정 전에 KIS 조회로 누계를 확인하고, 확정 뒤 차이는 `ADJUST` 행으로 맞춘다
- 결정: 리스크 검사는 두 번. 결정 때는 사이징이 한도를 입력으로 쓰고, 주문 저장 때는 계좌를 잠근 채 함께 쓰는 상태(주문 가능 금액, 매도 가능 수량, 비중, 일일 손실)를 다시 확인한 뒤 같은 트랜잭션에서 묶는다. 묶을 금액은 지정가 × 수량 + 예상 수수료
- 결정: 리스너는 이벤트(`OrderFinished`)를 신호로만 쓰고, 계좌를 잠근 뒤 끝난 주문을 끝난 시각 순으로 반영한다
- 수정: 조회 기록의 중복 방지 키에 상태 추가, 계좌 잠금은 `REQUIRES_NEW` 안에서만, "절대 삭제 금지" → "앱 계정으로는", 3.4 상태 머신에 `UNKNOWN`, 남아 있던 "체결 ID로 중복 제거" 문구 삭제
- 철회: 같은 날 "decide | 거래 원장 기록 원칙"의 "금액 원장 리스너는 반영 안 된 거래 행 전부를 처리"는 끝난 주문 단위 반영으로 바뀌었다
- 바뀐 문서: plan.md 3.4·3.5·3.7·4.6·5장(`orders`, `cash_ledger`)·8장, m0-foundation.md, strategy.md 15장
- 이유: 서브에이전트 정합성 검토(기획·git 두 갈래)에서 나온 지적

## 2026-10-13 decide | M0 설계 2차 (B-01 정할 것 5~7번)
- 결정: PIT는 `domain`·`application/service`만, 기준선 없이 보고만(2026-10-10 결정 재확인). 살아남은 뮤턴트는 4분류로 미분류 0개, 이유는 커밋 본문. `pitestChanged` 태스크 정의
- 결정: Compose는 TimescaleDB `2.26.1-pg18`만(`127.0.0.1`), Ollama는 Mac에서 직접, `spring-boot-docker-compose`로 자동 실행, Flyway V1은 확장만, M0부터 Flyway 계정과 앱 계정 분리
- 결정: 코드 브랜치 `<종류>/M<번호>-<slug>`(B-18 뒤 `<종류>/<이슈>-<slug>`), 코드 브랜치에서 기획 문서 안 고침, 커밋에 `Refs: #<이슈>`, PR의 `Closes #<번호>`로 이슈를 닫음
- 바뀐 문서: m0-foundation.md, CLAUDE.md 결정된 사항·Git, work-orders.md
- 남은 것: 7번의 머지 방식, 8번

## 2026-10-13 decide | 저장소 공개와 기획 관리 방향
- 결정: stock(`loading1031/stock`)과 플러그인 마켓플레이스(`loading1031/claude-plugins`)를 public으로 올린다. `.env`·키·계좌번호는 올리지 않는다. 마켓플레이스는 GitHub 소스로 다시 등록(B-13 완료)
- 결정: 기획의 상세(작업지시서, 진행 메모)는 GitHub 이슈로, 로컬에는 짧은 색인과 결정 이력(B-18). 테이블 이름은 기능 접두어, 현금 원장은 `cash_tx`(B-17)
- 결정: 기존 커밋에 이슈 번호를 붙이려고 이슈 #1(초기 기획, 닫힘)·#2(B-01)를 만들고 커밋 8개를 `Refs:`를 넣어 다시 써서 강제 푸시했다. 백업은 로컬 `backup/*` 브랜치
- 바뀐 문서: CLAUDE.md 플러그인·Git, backlog.md B-13·B-17·B-18

## 2026-10-13 update | 거래 기록을 주문별 누적 상태로, 금액 원장은 끝난 주문만
- 결정: KIS 체결통보는 접수·정정·취소·거부·체결을 전부 받은 그대로 추가만 해서 저장한다. 기록은 "이 시점 주문의 누적 상태"(상태, 누적 수량, 누적 금액)로 하고, 놓친 체결은 역산하지 않는다. 오래 안 바뀐 주문과 장 마감 뒤 주문은 주기 조회로 KIS 누계를 그대로 기록한다
- 결정: 금액 원장은 끝난 주문 1건당 1행(최종 누적 금액). 진행 중에는 묶기만 하고 차감하지 않는다. 매도 가능 수량·주문 가능 금액은 누적 상태 기록과 묶음으로 계산한다
- 결정: 원장 순서는 주문이 끝난 순서. 실현 손익은 KIS와 대사
- 이유: KIS는 체결 고유 번호를 주지 않고(공식 예제 코드), 주기 조회는 주문별 합계만 준다. 앞 항목의 "거래 행 `external_id`(KIS 체결번호) `UNIQUE`"는 성립하지 않아 철회
- 바뀐 문서: plan.md 4.6(정합성 절 재작성)·5장(`executions`, `order_holds`, `positions`, `cash_ledger`)·8장, backlog.md B-02
- 남은 것: B-02의 KIS 확인 항목 6개

## 2026-10-13 decide | 거래 원장 기록 원칙과 외부 식별자 이름
- 결정: 거래 행은 처리와 상관없이 먼저 저장·커밋한다. 금액 원장 리스너는 반영 안 된 거래 행 전부를 처리하고 id 결번은 신경 쓰지 않는다. 거래 행은 삭제할 수 없게 보장한다
- 결정: 외부 시스템이 붙인 식별자 칼럼은 `external_id`. 멱등키 여부는 테이블마다 정한다
- 바뀐 문서: plan.md 4.6(정합성 절 재작성)·5장(`orders`·`executions` 칼럼)·8장, backlog.md B-02·B-17
- 남은 것: 원장 순서(기록 순서 / 실제 체결 순서), KIS 체결 고유 번호(B-02), 테이블 이름(B-17)

## 2026-10-13 update | 모듈 간 이벤트: Postgres Outbox → Spring Modulith 이벤트 발행 기록
- 결정: 유실되면 안 되는 이벤트는 직접 만든 Outbox 테이블·릴레이 대신 Spring Modulith 이벤트 발행 기록(JDBC, Postgres)으로 보장한다
- 이유: 실험에서 업무 트랜잭션 안 기록, 롤백 시 기록 없음, 리스너 실패 시 미완료로 남고 재전송 가능을 확인. Outbox·릴레이·재전송을 직접 만들 필요가 없다. 리스너가 비동기라 처리 순서는 보장되지 않으므로, 리스너는 이벤트를 신호로만 쓰고 저장된 체결을 id 순으로 반영한다(plan.md 4.6 제안)
- 바뀐 문서: plan.md 4.2·4.6·5장(`outbox` → `event_publication`)·7장 M3, CLAUDE.md 결정된 사항, m0-foundation.md
- 남은 것: 재전송 방식과 완료 기록 정리는 M3에서. 시각화 문서는 동기화 빚

## 2026-10-13 decide | M0 설계 1차 (B-01)
- 결정: Gradle 단일 모듈 + 기능 우선 패키지, 기본 패키지 `com.loading1031.stock`
- 결정: PIT 변경분 실행은 `git diff`로 대상 클래스를 넘긴다(Arcmutate 안 씀), `avoidCallsTo = kotlin.jvm.internal`
- 결정: kopring 범용 규칙 4개 추가(`time/inject-clock`, `bigdecimal/rounding-mode`, `bigdecimal/no-double-ctor`, `log/no-secret`), `JdbcClient`를 어댑터 전용으로. 플러그인 0.2.0
- 결정: 시계열은 읽기·쓰기 모두 SQL(`JdbcClient`, 일괄 삽입은 `NamedParameterJdbcTemplate`). JPA 쓰기·Exposed·jOOQ는 쓰지 않음
- 결정: 기능 사이 의존은 `adapter/out`(상대 서비스 호출)과 이벤트 리스너(상대 이벤트 수신)에서만, 순환 금지. ArchUnit 직접 작성으로 검사(Modulith `verify()`는 안 씀)
- 바뀐 문서: m0-foundation.md 신설, plan.md 2장·4.3·4.5·4.6·7장 M0·8장, CLAUDE.md 문서·결정된 사항, backlog.md B-10·B-15·B-16·B-17
- 남은 것: 작업지시서 B-01 "정할 것" 5번 나머지, 6·7·8번

## 2026-10-10 decide | 작업지시서
- 결정: 세션이 바뀌어도 이어지도록 항목별 작업지시서(work-orders.md)를 둔다. pick이 먼저 읽고, done이 지우고, 세션 끝에 /planning:handoff로 갱신
- 바뀐 문서: work-orders.md 신설(B-01, B-03, B-02, B-13, B-14, 동기화), CLAUDE.md, planning 플러그인 0.3.0

## 2026-10-10 decide | 백로그 항목별 브랜치
- 결정: 백로그 항목 하나 = 기획 브랜치 하나(`plan/<ID>-<slug>`). pick에서 만들고, spec·commit은 그 브랜치에서, `/planning:done`에서 main으로 `--no-ff` 합친 뒤 삭제. 설정·도구(`chore:`)는 main에 바로
- 바뀐 문서: CLAUDE.md 기획 설정·진행 방식, backlog.md "진행 중" 표, planning 플러그인 0.2.0
- 남은 것: 코드 브랜치 규칙은 B-01에서

## 2026-10-10 decide | 진행 방식과 컨벤션을 플러그인으로
- 결정: 프로젝트마다 복사하던 것을 플러그인으로 묶는다. 마켓플레이스 `~/Documents/claude-plugins`(`loading1031-plugins`)에 `planning`(기획 진행)과 `kopring`(Kotlin + Spring 컨벤션)
- 결정: 프로젝트 고유 값(기획 폴더, 시각화 문서, 용어, 동기화 표)은 CLAUDE.md "기획 설정"에 둔다
- 바뀐 문서: CLAUDE.md, plan.md M0, backlog.md B-01. `.claude/commands/*`, `.claude/rules/planning.md` 삭제
- 남은 것: 마켓플레이스 GitHub 업로드, kopring-conventions 저장소와의 원본 관계 정리

## 2026-10-10 decide | 기획 진행 방식
- 결정: 백로그에서 주제 고르기(`/backlog`) → 조사·논의 → 문서 반영(`/spec`) → 커밋(`/commit`). 세션 하나에 백로그 항목 1~2개
- 바뀐 문서: CLAUDE.md, .claude/rules/planning.md, .claude/commands/{backlog,spec,commit}.md, backlog.md, log.md
- 남은 것: B-01 ~ B-12

## 2026-10-10 update | 용어 정리
- 결정: "단계"를 쓰지 않는다. 운영 시기 = 모의 운영 / 실전 운영 / 확장, 개발 순서 = M0~M7
- 바뀐 문서: plan.md 1·7장, strategy.md 머리말, 시각화 문서 목표·로드맵

## 2026-10-10 decide | 모의 계좌 수명과 리셋 처리
- 결정: 계좌에 만료일 저장·2주 전 알림, 월 1회 앱 접속 상기, 토큰 실패 즉시 알림. 대사에서 큰 불일치는 "계좌 리셋"으로 판정해 자동매매 정지, 성과를 새 구간(`account_epochs`)으로 시작
- 바뀐 문서: plan.md 3.2·3.8·5·8장, strategy.md 14·15·18·19장
- 남은 것: 참가 기간 선택지, API 호출이 접속으로 인정되는지 (B-02)

## 2026-10-10 decide | 교체 매매
- 결정: 모의 운영에서는 실제로 켠다(허들 0.15, 하루 1건, 매도 체결 확인 후 매수). 효과는 "교체 없음" 가상 장부와 비교. 실전 운영은 모의에서 동작·이득 확인 후 켬
- 결정: 장부 4개 — 운영(실제 주문), 교체 없음, jev 매수만, 단순 규칙(가상)
- 바뀐 문서: strategy.md 0·12·16·17·18장, 시각화 문서 워크플로

## 2026-10-10 decide | 운영 전략
- 결정: 원칙 "숫자는 코드, 판단은 jev, 한도는 규칙". jev(nimble)는 뉴스 분류·매수 필터·보유 재평가 세 곳에만
- 결정: 아침 파이프라인(06:00 수집 → 07:00 리포트 → 08:40 jev → 08:45 결정 → 09:00 주문), 장중은 강제 청산만
- 결정: 위험 예산 = 고정 상한 × 국면 배수. 사이징 = ATR 기반 고정 비율 × 확신도. 켈리는 모의 운영에서 쓰지 않음
- 결정: 매수는 포지션 계획(분할 회차, 무효화 가격, 목표 주가, 만료). 계획에 없는 물타기 금지. 매도는 강제 청산 우선, jev는 앞당기기만
- 바뀐 문서: strategy.md 신설, plan.md 3.6·5·7장, 시각화 문서 "운영 전략 워크플로"

## 2026-10-10 decide | 모의투자 제약 대응
- 결정: 모의 운영은 정규장 + 지정가·시장가만. 백테스트 체결 모델은 모의보다 보수적으로. 실전에서 슬리피지 실측
- 근거: 모의 체결은 실제 체결이 생겨야, 실제 체결량만큼만 (2차 자료 기준)
- 바뀐 문서: plan.md 3.4·3.5·3.7·3.9·8장, strategy.md 15장

## 2026-10-10 decide | 해외·선물 지표
- 결정: 해외 주식·선물은 거래하지 않고 분석 입력으로만. 소스는 KIS API로 통일(부족하면 FRED). `available_at` 저장, 선물 롤오버, 야간선물 거래일은 끝나는 날 기준
- 바뀐 문서: plan.md 3.11·4.5·5·7·8장

## 2026-10-10 decide | 시세 원천과 NXT
- 결정: 시세 소스와 주문 증권사를 별도 포트로 분리. 과거 일봉 백필은 KRX Open API. 시장·세션 캘린더(KRX/NXT), 주문에 집행 시장(KRX/NXT/SOR). 보유 수량은 시장 구분 없이 하나
- 바뀐 문서: plan.md 1·3.3·3.4·5·7·8장

## 2026-10-10 decide | 이벤트와 pub/sub
- 결정: 유실 금지 이벤트는 Spring 이벤트 + Postgres Outbox, 실시간 시세는 코루틴 `SharedFlow`. R2DBC·리액티브 DB 계층은 쓰지 않고 JDK 25 가상 스레드 사용
- 바뀐 문서: plan.md 4장

## 2026-10-10 decide | 테스트
- 결정: 뮤테이션 테스트 PIT, `domain`·`application.service` 대상, 변경분만 실행, 점수 기준선은 걸지 않음
- 바뀐 문서: plan.md 7장 M0

## 2026-10-10 decide | 아키텍처와 스택
- 결정: 모듈러 모놀리스, out 포트 헥사고날(kopring-conventions), JPA + Kotlin JDSL, 시계열은 TimescaleDB + `JdbcClient`(명시적 예외)
- 결정: JDK 25, Kotlin 2.3+, Spring Boot 4.1, Gradle 9.1+, PostgreSQL + TimescaleDB, 인증은 JWT + Refresh Token(프론트엔드 SPA)
- 결정: 증권사는 KIS 모의투자로 시작. 에디터는 Zed
- 바뀐 문서: plan.md 신설, 시각화 문서 신설
