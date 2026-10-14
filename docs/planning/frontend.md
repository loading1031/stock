# 프론트엔드

- 작성일: 2026-10-14
- 상태: 확정
- 관계: [plan.md](plan.md) 2장(스택)·3.1(인증)·3.7(자동 주문 끄기·미체결 주문 취소)·3.10(프론트엔드 API)의 상세. 백로그 B-03, 이슈 [#5](https://github.com/loading1031/stock/issues/5)

## 결론

Next.js 서버를 BFF(Backend For Frontend)로 두고, 화면은 서버 컴포넌트로 만든다. 브라우저는 Next하고만 통신하고, Spring은 Next가 보낸 요청만 받는다. 사용자 인증은 Next 세션이 맡고, Spring은 서비스 키 하나만 검사한다.

## 결정 사항

| 항목 | 결정 | 이유 |
|---|---|---|
| 프레임워크 | Next.js App Router (확인 시점 `next` 16.4.0, `react` 19.3.0). 서버 컴포넌트가 기본이고, Next 서버를 실행한다(정적 내보내기 아님) | SSE 중계, 서버 컴포넌트로 하는 서버 드리븐 UI |
| 언어·도구 | TypeScript(확인 시점 7.0.2), 패키지 관리 pnpm(확인 시점 12.11.2), 번들러 [Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)(Rust. Next 16부터 `next dev`·`next build` 기본값이라 설정 없음, `--webpack`을 쓰지 않는다) | 사용자 결정. Turbopack은 타입 검사를 하지 않으므로 `tsc --noEmit`을 따로 돌린다 |
| React Compiler | 처음부터 켠다. `next.config.ts`에 `reactCompiler: true`(Next 16에서 정식), 개발 의존성 `babel-plugin-react-compiler` | `useMemo`·`useCallback`을 손으로 쓰지 않아도 렌더링을 줄여 준다. 다시 렌더링되는 것은 클라이언트 컴포넌트뿐이라 효과는 차트·실시간 가격·주문 폼에 난다. Next가 JSX·훅이 있는 파일에만 적용해 빌드 비용이 작다 |
| 메모이제이션 컨벤션 | `useMemo`, `useCallback`, `React.memo`를 쓰지 않는다. 메모이제이션은 React Compiler에 맡긴다 | 손으로 쓴 메모이제이션은 의존성 배열 실수가 잦고, 컴파일러와 겹친다 |
| 역할 | Next = BFF. Spring `/api/v1` 호출은 모두 Next 서버가 한다 | 토큰이 브라우저에 나가지 않고, 같은 오리진이라 CORS가 필요 없다 |
| UI | [shadcn/ui](https://ui.shadcn.com/) (Tailwind) | 표·폼 위주의 관리 화면. `chart` 컴포넌트가 Recharts 기반 |
| 저장소 | 이 저장소의 `frontend/` | API와 함께 바뀐다 |
| 인증 | Next가 로그인과 세션(암호화된 httpOnly 쿠키)을 맡는다. 비밀번호 확인은 Spring에 요청한다. Spring은 서비스 키로 Next 요청만 받고, 사용자 ID·권한은 Next가 넣는 헤더로 받는다. `refresh_tokens`는 두지 않는다 | Spring이 `127.0.0.1`에 열려 있어도 브라우저 속 다른 사이트가 폼 POST나 DNS 리바인딩으로 닿을 수 있어 Spring 검사를 아예 뺄 수는 없다. 그러나 사용자 인증까지 Spring에 둘 필요는 없다 |
| 실시간 | SSE. Spring → Next 라우트 핸들러(중계) → 브라우저 `EventSource` | 서버에서 화면으로 가는 한 방향 흐름 |
| 차트 | 캔들·실시간 가격·매매 표시는 [Lightweight Charts](https://github.com/tradingview/lightweight-charts) 5.2.1, 성과·평가 차트는 [Recharts](https://github.com/recharts/recharts) 3 | 캔들·장 시간축·`update()`는 Lightweight Charts만, 범례·산점도·여러 차트 종류는 Recharts가 낫다. [비교 문서](https://claude.ai/code/artifact/979c3511-368e-4c55-a2e5-e5aa6242ed5e) |
| 미체결 취소·정정 | 주문 하나 단위. 목록은 종목, 매수·매도, 주문 방식, 낸 쪽(수동·전략)으로 거른다. 일괄 취소 버튼은 두지 않는다 | 일괄 취소는 손절 매도까지 지울 수 있다 |
| 자동 주문 끄기, 미체결 주문 취소 | 아래 "자동 주문 끄기와 미체결 주문 취소". "킬 스위치"라는 이름은 쓰지 않는다 | 이름만 보고 동작을 알 수 있게 |

로그인 시도 제한은 두지 않는다. Next가 `127.0.0.1`에만 열려 있으면 로그인 폼에 닿는 것은 내 Mac의 프로그램뿐이다. 외부 접속을 열게 되면 다시 다룬다.

## 상세

### 구조

```
브라우저 ──127.0.0.1:3000──▶ Next 서버 (frontend/)
                              ├ 서버 컴포넌트: Spring 호출 → 화면 구성
                              ├ 라우트 핸들러: SSE 중계, 폼 처리
                              └ 세션 쿠키 ↔ 사용자 ID·권한
                                    │ 서비스 키 + 사용자 헤더
                                    ▼
                              Spring /api/v1 ──▶ KIS, TimescaleDB, Ollama
```

- 화면은 서버 컴포넌트가 데이터를 가져와 그린다. 브라우저에서 계속 돌아야 하는 것만 클라이언트 컴포넌트(`"use client"`)로 화면 말단에 둔다: 차트, 실시간 가격, 입력 중 계산이 필요한 주문 폼.
- 서버 컴포넌트는 요청마다 한 번 실행되고 끝난다. 그래서 SSE를 받아 화면을 고치는 일은 클라이언트 컴포넌트가 한다.
- Spring의 REST(`/api/v1`, Spring Boot 4 API 버전 기능)는 그대로 둔다. 나중에 다른 클라이언트가 생겨도 같은 API를 쓴다.

### 인증 흐름

| 순서 | 누가 | 하는 일 |
|---|---|---|
| 1 | 브라우저 → Next | 로그인 폼 제출 |
| 2 | Next → Spring | 서비스 키와 함께 비밀번호 확인 요청. Spring이 BCrypt(또는 Argon2)로 확인하고 사용자 ID·권한을 돌려준다 |
| 3 | Next → 브라우저 | 암호화된 httpOnly 세션 쿠키 발급 |
| 4 | 이후 요청 | Next가 쿠키를 풀어 사용자 ID·권한을 헤더로 붙이고, 서비스 키와 함께 Spring을 호출한다 |
| 5 | 로그아웃 | 쿠키 삭제 |

- Spring Security에는 서비스 키 필터 하나를 둔다. `ADMIN` 전용 작업(실전 모드 전환)은 권한 헤더로 확인한다.
- 제안: 서비스 키는 `.env`에 두고 비밀 타입(B-10)으로 받으며, 상수 시간으로 비교한다. Next와 Spring 모두 `127.0.0.1`에만 연다.

### 데이터 공유와 그리기

여러 화면(나중에는 여러 사용자)이 같은 데이터를 보면 데이터는 서버에서 공유하고, 그리기는 각 브라우저가 한다. 그리기를 서버로 옮기면 사용자마다 서버 비용이 든다.

| 일 | 어디서 | 공유 방법 (제안, M2에서 설계) |
|---|---|---|
| KIS 실시간 구독 | Spring | 종목당 구독 하나. Spring 안의 시세 배포기가 SSE 연결과 전략에 복사해 보내고, 보는 쪽이 0이 되면 해제한다 |
| 캔들 조회 | Spring, Next | 같은 종목·기간의 응답을 캐시한다(Next `"use cache"` 또는 Spring 캐시) |
| SSE 중계 | Next | 종목당 Spring 연결 하나를 여러 브라우저에 나눠 보낸다 |
| 차트 그리기 | 브라우저 | 공유하지 않는다 |

### 화면 목록

| 마일스톤 | 화면 | 내용 | 차트 |
|---|---|---|---|
| M1 | 로그인 | 비밀번호 로그인 | |
| M1 | 계좌 연결 | 증권사, 모의·실전, 계좌번호, App Key·Secret, 만료일 | |
| M1 | 대시보드 (첫 판) | 모의 계좌 잔고, 보유 종목, 평가 손익 (KIS 조회 그대로) | |
| M2 | 종목 검색·관심 종목 | 종목 마스터 검색, 관심 목록 | |
| M2 | 종목 차트 | 일봉·분봉 캔들, 거래량, 실시간 가격 | Lightweight Charts |
| M2 | 아침 해외 지표 | 간밤 SOX, 지수 선물, KOSPI200 야간선물 | 표 |
| M3 | 주문 | 매수·매도·정정·취소, 미체결·체결 목록, 체결 알림. 차트에 매수·매도 표시와 평균 단가선 | Lightweight Charts |
| M3 | 대시보드 (원장 기반) | 내부 원장 잔고, 금액 원장 내역, 자산 추이, 종목별 비중 | Recharts |
| M4 | 리스크 설정 | 한도 값 편집 | |
| M4 | 자동 주문 켜기·끄기 | 모든 화면 상단에 고정된 토글과 현재 상태 | |
| M4 | 미체결 주문 취소 | 종목·방향(매수/매도)을 골라 그 미체결만 취소 | |
| M4 | 대사 결과 | KIS와 내부 장부의 차이, 복구 기록 | |
| M5 | 아침 리포트·판단 기록 | 그날 리포트, jev 판단과 근거, 사이징 결과(`decisions`) | |
| M5 | 포지션 계획 | 분할매수 회차, 목표 주가, 무효화 가격 | Lightweight Charts |
| M5 | 전략 목록·설정 | 전략 상태, 파라미터 | |
| M5 | 장부 비교·평가 | 장부 4개의 비용 차감 후 수익률·MDD, jev 보정, 매도 사후 평가 ([strategy.md](strategy.md) 16장) | Recharts |
| M6 | 백테스트 결과 | 자산 곡선, 거래 내역, 모의 운용과 비교 | Recharts |
| M7 | 실전 전환 | `ADMIN` 전용 실전 모드 전환, 실전 전환 기준 점검표 | |

### 자동 주문 끄기와 미체결 주문 취소

두 버튼은 따로 있다. **자동 주문 끄기**는 새 자동 주문을 막고, 이미 낸 주문과 보유 종목에는 손대지 않는다. **미체결 주문 취소**는 고른 종목·방향의 미체결만 취소한다. 이전 이름 "킬 스위치"는 "전량 청산·전부 취소"로 읽히기 쉬워 쓰지 않는다.

| 대상 | 자동 주문을 끄면 |
|---|---|
| 새 자동 주문 (아침 매수, 분할매수 회차, 교체, 재평가 매도, **강제 청산**) | 나가지 않는다 |
| 이미 낸 미체결 주문 | 그대로 둔다. 취소는 "미체결 주문 취소"로 따로 한다 |
| 보유 종목 | 팔지 않는다 |
| 포지션 계획 | 상태를 그대로 두고 회차만 나가지 않는다 |
| 수동 주문 | 한 번 더 확인받고 허용한다 |

- 강제 청산까지 멈추는 이유: 강제 청산 로직 자체가 잘못됐을 때도 멈출 수 있어야 한다.
- Ollama 장애·데이터 지연·대사 불일치는 자동 주문 끄기와 별개다. 그때는 jev를 거치는 매수가 저절로 나가지 않고, 강제 청산은 계속 돈다([strategy.md](strategy.md) 1장 원칙 4).
- 미체결 주문 취소: 종목 목록과 종목별 매수/매도를 입력받는다. 기본은 빈 목록이라 아무것도 취소하지 않는다. 미체결이 있는 종목을 고를 수 있게 보여 주되 아무것도 미리 체크하지 않고, 실행 전에 취소될 주문 목록을 보여 주고 확인받는다.
- 제안: 자동 주문이 꺼져 있는 동안 모든 화면에 "강제 청산도 멈춤 — 손절 보호 없음" 경고를 띄운다.
- 제안: 다시 켤 때, 켜지는 즉시 나갈 강제 청산 주문(그사이 조건에 닿은 종목)을 보여 주고 확인받는다.
- 제안: 자동 주문이 꺼진 동안 만료일이 지난 포지션 계획은 평소처럼 만료한다.

### 프론트엔드 컨벤션

- 메모이제이션 훅(`useMemo`, `useCallback`)과 `React.memo`는 쓰지 않는다. React Compiler가 맡는다.
- 상태·효과 훅(`useState`, `useEffect`, `useRef`)은 클라이언트 컴포넌트에서만 쓴다. 화면 대부분은 서버 컴포넌트라 훅이 없다.
- 제안: ESLint `no-restricted-imports`로 `useMemo`·`useCallback`·`memo` 가져오기를 막는다. 컴파일러가 최적화를 포기한 컴포넌트를 찾도록 `eslint-plugin-react-hooks`의 컴파일러 규칙을 켠다.
- 제안: 컴파일러가 잘못 최적화하는 경우에만 `"use no memo"`를 쓰고, 그 이유를 주석으로 남긴다.

## 데이터 모델 영향

- `refresh_tokens` 삭제. 세션은 Next의 암호화 쿠키에 있고 DB에 두지 않는다.
- `users`는 그대로(id, email, password_hash, role).

## 다른 문서에 반영할 곳

- plan.md 2장: 프론트엔드 줄
- plan.md 3.1: 인증 방식
- plan.md 3.3: 실시간 체결가 중계 방식
- plan.md 1장: 용어(자동 주문 끄기, 미체결 주문 취소)
- plan.md 3.7: 자동 주문 끄기·미체결 주문 취소 행
- plan.md 3.10: 요약과 링크
- plan.md 5장: `refresh_tokens` 삭제
- plan.md 7장: M1 내용
- plan.md 8장: 프론트엔드 기술 체크, 아래 확인 항목
- strategy.md 머리말 용어, 0장 Mermaid, 9.3, 11.2, 11.3, 18장 `exits`: 자동 주문 끄기
- CLAUDE.md "결정된 사항": 프론트엔드 행

## 확인이 필요한 것

- [ ] Next 세션 구현 방식 (직접 암호화한 쿠키 / iron-session / Auth.js)
- [ ] Node 버전, 개발할 때 `bootRun`과 `next dev`를 함께 띄우는 방법
- [ ] TradingView 출처 표기 방식(차트 로고 `attributionLogo` / 화면 하단 링크). Apache-2.0 NOTICE와 tradingview.com 링크가 필요하다
- [ ] Recharts 번들 크기 (빌드 후 측정)
- [ ] 분봉 수천 개와 실시간 갱신에서 Lightweight Charts 체감 성능 (M2)

## 출처

- 버전·라이선스·의존성: `npm view next react lightweight-charts recharts` (2026-10-14)
- [Lightweight Charts GitHub](https://github.com/tradingview/lightweight-charts): Apache-2.0, 출처 표기 조건, HTML5 Canvas
- [Lightweight Charts 시리즈 종류](https://tradingview.github.io/lightweight-charts/docs/series-types)
- [Lightweight Charts v5 발표](https://www.tradingview.com/blog/en/tradingview-lightweight-charts-version-5-50837): 기본 번들 약 35kB, 여러 창
- [Recharts API](https://recharts.github.io/en-US/api): 차트 종류, SVG
- [shadcn/ui Chart](https://ui.shadcn.com/docs/components/chart): Recharts v3 기반
- [Next.js 블로그](https://nextjs.org/blog)
- [Next.js Turbopack](https://nextjs.org/docs/app/api-reference/turbopack): Rust로 만든 번들러, 16.0.0부터 기본, 타입 검사 안 함
- [Next.js reactCompiler](https://nextjs.org/docs/app/api-reference/config/next-config-js/reactCompiler): 16.0.0부터 정식, Babel 플러그인을 관련 파일에만 적용
- 버전: `npm view pnpm typescript` (2026-10-14)
