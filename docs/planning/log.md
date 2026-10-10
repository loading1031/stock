# 기획 결정 이력

최신이 위. 형식은 planning 플러그인의 `rules` 스킬.

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
