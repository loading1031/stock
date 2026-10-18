// 설계 문서의 왼쪽 탐색 메뉴. 제품의 메뉴가 아니다(제품 메뉴는 components/shell.html).
// 각 페이지는 <nav id="side"></nav>와 <body data-root=".." data-page="order">를 두고 이 파일을 불러온다.
(function () {
  const PAGES = [
    { group: '개요', items: [['index', '개요 · 정보 구조 · 결정']] },
    { group: 'M1', items: [['screens/login', '로그인'], ['screens/account', '계좌 연결'], ['screens/dashboard-first', '대시보드 (첫 판)']] },
    { group: 'M2', items: [['screens/search', '종목 검색·관심 종목'], ['screens/chart', '종목 차트'], ['screens/morning-global', '아침 해외 지표']] },
    { group: 'M3', items: [['screens/order', '주문'], ['screens/dashboard-ledger', '대시보드 (원장 기반)']] },
    { group: 'M4', items: [['screens/risk', '리스크 설정'], ['screens/auto-order', '자동 주문 켜기·끄기'], ['screens/cancel-open', '미체결 주문 취소'], ['screens/reconcile', '대사 결과']] },
    { group: 'M5', items: [['screens/report', '아침 리포트·판단 기록'], ['screens/position-plan', '포지션 계획'], ['screens/strategies', '전략 목록·설정'], ['screens/books', '장부 비교·평가']] },
    { group: 'M6·M7', items: [['screens/backtest', '백테스트 결과'], ['screens/go-live', '실전 전환']] },
    { group: '공통 UI (구현 전 설계)', items: [['components/shell', '화면 틀'], ['components/auto-order-bar', '자동 주문 표시줄'], ['components/confirm-dialog', '확인 대화상자'], ['components/status-names', '상태 표시명'], ['components/order-chain-row', '주문 체인 행']] },
  ];
  const root = document.body.dataset.root || '.';
  const page = document.body.dataset.page || 'index';
  const nav = document.getElementById('side');
  if (!nav) return;
  let html = '<div class="doc-title">stock 화면 설계</div>';
  for (const g of PAGES) {
    html += `<div class="group">${g.group}</div>`;
    for (const [path, label] of g.items) {
      const cur = path === page || path.endsWith('/' + page) ? ' class="current"' : '';
      html += `<a href="${root}/${path}.html"${cur}>${label}</a>`;
    }
  }
  nav.innerHTML = html;
})();
