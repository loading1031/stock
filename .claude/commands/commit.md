# /commit — 커밋

변경 사항을 분석해 커밋을 만든다.

## 사용법

```
/commit              — 변경 분석 후 커밋
/commit msg "메시지"  — 메시지 지정
```

## 접두어

| 작업 | 접두어 | 예시 |
|---|---|---|
| 기획 문서 | `docs:` | `docs: 교체 매매를 모의 운영에서 켜기로 결정` |
| 기능 개발 | `feat:` | `feat: KIS 토큰 발급 어댑터 구현` |
| 버그 수정 | `fix:` | `fix: 야간선물 거래일 계산 오류` |
| 리팩토링 | `refactor:` | |
| 테스트 | `test:` | |
| 설정·도구 | `chore:` | `chore: /spec 명령 추가` |

메시지 원칙:
- 한국어, 50자 이내
- 무엇을 바꿨는지보다 **무엇을 결정했는지 / 왜** — "plan.md 수정"이 아니라 "모의 계좌 리셋 판정 기준 추가"
- 본문이 필요하면 빈 줄 뒤에 바뀐 문서 목록을 쓴다

## 실행 절차

1. 변경 확인
   ```bash
   git status --short
   git diff --stat
   ```
2. 스테이징: 관련 파일만 이름으로 `git add`. `git add -A`, `git add .`는 쓰지 않는다. `.env`, 키, 계좌 정보가 든 파일은 절대 넣지 않는다.
3. 커밋 (마지막 줄에 아래 Co-Authored-By를 넣는다)
   ```bash
   git commit -m "$(cat <<'EOF'
   docs: <메시지>

   <필요하면 본문>

   Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
   EOF
   )"
   ```
4. 확인
   ```bash
   git log --oneline -3
   git status --short
   ```

## 규칙
- 기획(`docs:`)과 코드(`feat:` 등) 변경을 한 커밋에 섞지 않는다.
- amend는 사용자가 요청할 때만, push되지 않은 커밋에만 한다.
- push는 사용자가 요청할 때만 한다.
- pre-commit 훅이 실패하면 고친 뒤 새로 커밋한다(`--no-verify` 금지).
