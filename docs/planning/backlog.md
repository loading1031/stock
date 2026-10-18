# 기획 백로그

다음에 기획할 주제. 형식과 우선순위 기준은 planning 플러그인의 `rules` 스킬.

- P0 = 다음 마일스톤 착수 전에 필요, P1 = 해당 마일스톤 안에서 필요, P2 = 나중
- 작업지시서는 GitHub 이슈(라벨 `plan`)에 있다. 이슈 칸이 `—`인 항목은 `pick`할 때 만든다.

## 권장 순서

| 순서 | ID | 이슈 | 사용자 준비물 |
|---|---|---|---|
| 1 | B-02 KIS API 검증 | [#6](https://github.com/loading1031/stock/issues/6) | **KIS 모의투자 신청 + KIS Developers 모의 앱키 발급** |
| 3 | B-24 프론트·백엔드 작업 나누기 | [#16](https://github.com/loading1031/stock/issues/16) | 없음 |
| 아무 때나 | B-14 kopring 원본 정리 (claude-plugins 저장소에서) | [#7](https://github.com/loading1031/stock/issues/7) | A/B 선택 |
| 아무 때나 | B-21 시각화 문서 동기화 | [#8](https://github.com/loading1031/stock/issues/8) | 없음 |

B-02는 준비물이 있어야 의미가 있다. 모의투자 신청은 미리 해 두면 좋다(신청 후 3개월 미접속 해지 주의).

## 후보

| ID | 주제 | 왜 필요한가 | 선행 | 우선순위 | 이슈 |
|---|---|---|---|---|---|
| B-02 | KIS API 검증 계획 | plan.md 8장의 KIS 확인 항목(호출 한도, 체결통보, 해외·야간선물, 모의 체결 규칙, 계좌 수명, 중복 통보·주문별 누계 필드·수수료 확정 값·정정 주문 번호·시장가 매수 증거금·매도 대금 결제 시점, 해외주식 모의 주문·증거금률·미수 허용)을 어떤 순서·스크립트로 확인할지 | 모의 계좌·API 키 발급 (사용자) | P0 | [#6](https://github.com/loading1031/stock/issues/6) |
| B-04 | 알림 채널 | 토큰 발급 실패, 계좌 리셋, 모의 계좌 만료, 자동 주문 꺼짐, 체결을 무엇으로 알릴지 미정 | — | P1 | — |
| B-05 | 아침 리포트 포맷과 jev 질문 설계 | 리포트를 어떤 형태(표/문장, 한국어/영어)로 넣을지, 질문 문구, nimble 한국어 품질과 입력 길이 한도 검증 방법 | B-02 일부 | P1 | — |
| B-06 | 뉴스 수집 상세 | DART·네이버 검색 API 한도와 약관, 기사↔종목 매핑, 중복 기사 묶기, 수집 주기 | — | P1 | — |
| B-07 | 국내 종목 ↔ 미국 연관 종목 매핑 | 리포트 피처 "연관 미국 종목 등락"의 기준 데이터. 업종·공급망을 누가 어떻게 관리할지 | — | P1 | — |
| B-08 | 백테스트 엔진 상세 | 보수적 체결 모델 구현, `available_at` 강제, 종목명·날짜 익명화, 가상 장부와 코드 공유 | — | P1 | — |
| B-09 | 파라미터 검증 설계 | 국면 판정·사이징·기준값(0.70/0.60 등)을 어떤 기간·방법으로 검증할지, 과최적화 방지 | B-08 | P1 | — |
| B-10 | 비밀 관리 | App Key·계좌번호 암호화 마스터 키를 로컬에서 어디에 어떻게 둘지, 백업. 2026-10-13 사용자 결정: KIS **App Secret만** 비밀 타입(`toString()`이 가려진 값을 내는 value class)으로 받는다. App Key는 일반 값. B-03으로 Spring 서비스 키·Next 세션 암호화 키가 대상에 추가됨. 제안: `.env`를 `spring.config.import`로 읽고, 카나리 테스트로 로그에 Secret이 없는지 검사(실험 프로젝트에서 확인). 확인 필요: KIS가 매 요청 헤더에 App Secret을 요구하는지(그렇다면 HTTP 클라이언트 헤더 로깅 금지) | — | P1 | — |
| B-11 | 실전 전환 체크리스트 상세 | strategy.md 16.3을 실행 가능한 체크리스트로. 소액 규모, 롤백 방법 | B-09 | P2 | — |
| B-12 | 두 번째 증권사 검토 | 토스증권 Open API(2026-08 정식 출시)의 모의투자·실시간 스트림 지원 여부 | — | P2 | — |
| B-14 | kopring 원본 정리 | kopring-conventions 저장소와 플러그인에 같은 규칙이 두 벌 있음. 원본을 하나로 (저장소를 플러그인 구조로 바꾸거나 플러그인을 github 소스로 참조) | — (B-13 완료) | P1 | [#7](https://github.com/loading1031/stock/issues/7) |
| B-15 | 통화와 환율 처리 | 해외 종목 금액을 통화와 함께 저장하는 방식(JSR 354 Moneta + Hypersistence `MonetaryAmountType` 후보), 원화 환산 표시·정렬. 2026-10-12 사용자 결정(국내·해외 간 환산 보류, USD 그대로 표시)을 2026-10-14 사용자 결정으로 바꿈: 해외 종목은 원래 통화 금액·원화 금액·환율·기준 시각을 항상 함께 응답하고 둘 다 표시한다. 원화 환산은 KIS 값을 쓴다(잔고는 원화로 요청, 시세는 현재가상세 `t_xprc`, 실시간 체결가는 현재가상세 `t_rate`를 곱함). 별도 환율 API는 두지 않는다(무료 실시간 API 중 믿을 만한 곳이 없었음). 확인됨(open-trading-api 예제): 해외주식 현재가상세(`HHDFS76200200`)에 원환산 가격 `t_xprc`·당일환율 `t_rate`·전일환율 `p_rate`, 체결기준현재잔고(`CTRP6504R`)에 원화·외화 선택(`wcrc_frcr_dvsn_cd`)·원화 금액·기준환율 `bass_exrt`. 현재가(`HHDFS00000300`)와 실시간지연체결가(`HDFSCNT0`)에는 원화 값이 없다. 확인 필요: `t_rate`가 장중에 바뀌는지(B-02). 참고: BigDecimal은 JSON 문자열로 보낸다(claude-plugins 이슈 #6) | B-02(`t_rate` 장중 변동) | P2 | — |
| B-16 | 코인 시세 (보류) | 거래소 API(업비트 등) 연동, ISO에 없는 통화(USDT), 24시간 장. 2026-10-12 사용자 결정으로 보류: 당분간 주식 시장에 상장된 코인 관련 종목·ETF로 본다 | B-15 | P2 | — |
| B-17 | DB 테이블 이름 규칙과 잔고 구조 | 테이블 이름만으로 기능과 내용이 안 드러남. 2026-10-13 사용자 결정: 기능 접두어 방식(`order_…`, `portfolio_…`, `market_…`), 현금 원장은 `cash_tx`(→ `portfolio_cash_tx`). 외부 식별자 칼럼은 `external_id`로 통일(결정). 이름 후보: 거래 기록 `order_trade_tx`(4.6에서 "주문의 누적 상태 기록"이 되어 이름 재검토 필요), 금액 원장 `portfolio_cash_tx`, 보유 `portfolio_holdings`. 제안: 현재 잔고는 계좌 행에 두고 원장과 같은 트랜잭션에서 갱신, 일별 마감 잔고 스냅샷(장부 비교·KIS 대사용), `cash_tx`에 `UNIQUE(type, ref_id)`. 참고: 100만 행(약 27년치) 전체 합계 26ms로 파티션은 불필요(실측) | — | P1 | — |
| B-19 | jev 장기 기억과 Graphiti 검토 | Graphiti(getzep/graphiti, 시간 정보가 있는 지식 그래프)를 jev 기억으로 쓸지. 2026-10-13 검토: jev 입력은 코드가 만든 리포트뿐이라는 원칙, 백테스트의 미래 엿보기(`available_at`, 익명화), 판단 재현성, Python + Neo4j/FalkorDB 인프라, 작은 로컬 모델의 추출 품질이 걸림. 관계 그래프 자체는 B-07(연관 종목)·B-06(뉴스↔종목)에서 코드가 피처를 만드는 용도로 검토 | B-06, B-07 | P2 | — |
| B-20 | 해외주식 모의 거래 범위 | 한국투자증권 모의투자 안내(통합증거금)에 따르면 모의에서도 국내·해외를 한 계좌로 거래할 수 있다. 지금은 해외를 분석 전용으로 둔다(plan.md 3.11). 거래로 넓힐지, 통합증거금·환율(B-15)·세션(미국장 야간)·리스크 한도를 어떻게 다룰지 | B-02, B-15 | P2 | — |
| B-21 | 시각화 문서 동기화 | "동기화 빚"이 쌓여 시각화 문서가 문서보다 뒤처짐. 다이어그램마다 렌더링 확인 | — | P1 | [#8](https://github.com/loading1031/stock/issues/8) |
| B-22 | 운영 시 Compose 구성 | 오래 돌릴 때 Spring·Next를 Compose로 묶고 Spring 포트를 열지 않는다("Compose는 TimescaleDB만" 결정 변경). 내부·외부 네트워크 분리, Ollama 연결, 이미지 빌드, 로그 | B-03 | P1 | — |

## 진행 중

| ID | 주제 | 브랜치 | 이슈 | 시작 |
|---|---|---|---|---|
| B-24 | 프론트·백엔드 작업 나누기 | `plan/B-24-work-split` | [#16](https://github.com/loading1031/stock/issues/16) | 2026-10-18 |

## 완료

| ID | 주제 | 결과 문서 | 날짜 |
|---|---|---|---|
| B-01 | M0 설계: Claude·빌드 기반 | [m0-foundation.md](m0-foundation.md), plan.md 4.6(주문·체결 정합성), 이슈 [#2](https://github.com/loading1031/stock/issues/2) | 2026-10-13 |
| B-13 | 마켓플레이스 GitHub 업로드 | [loading1031/claude-plugins](https://github.com/loading1031/claude-plugins)(public), 마켓플레이스를 GitHub 소스로 다시 등록, CLAUDE.md "플러그인" | 2026-10-13 |
| B-03 | 프론트엔드 기술과 화면 목록 | [frontend.md](frontend.md), plan.md 2장·3.1·3.7·3.10·5장·7장, strategy.md 9.3·11.2, 용어 "자동 주문 끄기·미체결 주문 취소", 이슈 [#5](https://github.com/loading1031/stock/issues/5) | 2026-10-14 |
| B-18 | 기획 관리를 GitHub 이슈로 | 작업지시서 = 이슈(라벨 `plan`), planning 0.5.0, CLAUDE.md "기획 진행 방식"·"Git", 이슈 [#4](https://github.com/loading1031/stock/issues/4) | 2026-10-14 |
| B-23 | 화면 디자인 문서 | [design/index.html](../../design/index.html)(정보 구조, 화면 18개, 공통 UI), frontend.md "화면 설계", plan.md 3.6~3.9·5장, strategy.md 9.3·15·16.3·17, CLAUDE.md "디자인", 이슈 [#13](https://github.com/loading1031/stock/issues/13) | 2026-10-18 |

## 동기화 빚

시각화 문서(https://claude.ai/code/artifact/a712f001-c5c0-4731-8015-d1bed440fac6)가 문서보다 뒤처진 곳.

- [ ] "데이터 모델" 다이어그램: `global_series`·`global_bars`·`futures_rolls`, `market_sessions`, `instruments.nxt_eligible`, `orders.venue`, `candles.venue`, `broker_accounts.expires_on`, strategy.md 18장 테이블이 없음
- [ ] "아키텍처" 다이어그램: `global` 모듈과 Ollama(jev) 어댑터가 없음
- [ ] "목표" 섹션의 스택 줄에 Ollama(jev)가 없음
- [ ] "주문·체결 흐름" 다이어그램: 교체 매매의 짝 주문(매도 체결 확인 후 매수)이 없음
- [ ] "아키텍처"·"데이터 모델"·"주문·체결 흐름" 다이어그램: Outbox → Spring Modulith 이벤트 발행 기록(`event_publication`), 기능 사이 의존 규칙, 계좌 잠금 (2026-10-13, B-01)
- [ ] "아키텍처" 다이어그램: Next BFF(서버 컴포넌트, SSE 중계, 서비스 키), "데이터 모델": `refresh_tokens` 삭제, "운영 전략 워크플로": 자동 주문 끄기가 강제 청산도 멈춤, 리스크 검사의 "킬 스위치" → "자동 주문 켜짐" (2026-10-14, B-03)
- [ ] "데이터 모델"·"주문·체결 흐름" 다이어그램: 주문의 누적 상태 기록(`executions`), `order_holds`, `orders.ledger_status`, 끝난 주문 단위 금액 원장, `external_id`, 두 번 하는 리스크 검사(결정 때·저장 때) (2026-10-13, B-01)
- [ ] "데이터 모델": `equity_snapshots`(제안), 전략 상태 `PAUSED`. "운영 전략 워크플로": 리셋 판정 = 자동 주문 끄기, 일일 손실 한도는 신규 매수만 건너뜀, 계획 만료 → HOLDING (2026-10-18, B-23)
- [ ] B-02를 합친 뒤 plan.md 3.2에 "키만 바뀌고 계좌번호가 같으면 같은 성과 구간"(지금은 strategy.md 15장에만) (2026-10-18, B-23)
