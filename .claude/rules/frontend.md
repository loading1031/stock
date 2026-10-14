---
paths:
  - "frontend/**"
---

# stock 프론트엔드 규칙

Next.js·TypeScript 범용 규칙은 `nextts` 플러그인([loading1031/claude-plugins#1](https://github.com/loading1031/claude-plugins/issues/1))이 맡는다. 여기에는 이 프로젝트의 설계만 둔다. 근거와 이유는 `docs/planning/frontend.md`.

## Spring 호출 (BFF)

- Spring `/api/v1`은 Next 서버(서버 컴포넌트, 라우트 핸들러, 서버 액션)에서만 부른다. 클라이언트 컴포넌트는 Spring 주소를 모르고 Next 라우트로만 요청한다.
- Spring 요청에는 Next 서버가 서비스 키와 사용자 ID·권한 헤더를 붙인다. 서비스 키는 `import "server-only"`인 모듈에서만 읽는다.
- 로그인: 비밀번호 확인은 Spring에 맡기고, 맞으면 Next가 암호화된 httpOnly 세션 쿠키를 만든다. JWT·Refresh Token은 없다.

## 실시간

- SSE만 쓴다. Spring SSE → Next 라우트 핸들러(중계, 서비스 키를 붙임) → 클라이언트 컴포넌트의 `EventSource`.
- 제안(M2에서 설계): 같은 종목은 Spring 연결 하나를 여러 브라우저에 나눠 보낸다.

## 화면과 차트

- 화면 구성과 데이터 조회는 서버 컴포넌트가 한다. 클라이언트 컴포넌트는 차트, 실시간 가격, 입력 중 계산이 필요한 주문 폼만.
- 캔들·거래량·실시간 가격·매수/매도 표시·가격선(평균 단가, 목표가, 무효화 가격)은 Lightweight Charts.
- 성과·평가 차트(자산 추이, 비중, 장부 비교, jev 보정, 매도 사후 평가, 백테스트)는 Recharts(shadcn `chart`).
- Lightweight Charts는 TradingView 출처 표기가 필요하다(로고/링크 중 방식은 확인 필요).
- UI 컴포넌트는 shadcn/ui, 패키지 관리는 pnpm.

## 주문 화면

- "킬 스위치"라는 말을 쓰지 않는다. 두 기능은 버튼이 따로다.
    - **자동 주문 켜기·끄기**: 모든 화면 상단에 고정한 토글. 끄면 강제 청산을 포함한 새 자동 주문이 나가지 않는다. 꺼진 동안 수동 주문은 한 번 더 확인받는다.
    - **미체결 주문 취소**: 종목과 방향(매수/매도)을 고른 것만 취소한다. 기본은 빈 목록이고, 아무것도 미리 체크하지 않으며, 실행 전에 취소될 주문 목록을 보여 주고 확인받는다.
- 미체결 취소·정정은 주문 하나 단위로 한다. 전체 일괄 취소 버튼을 두지 않는다.
