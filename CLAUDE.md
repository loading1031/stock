# stock — 자동매매 플랫폼

한국투자증권(KIS) 모의투자로 시작해 실전·다른 증권사로 넓혀 가는 개인용 자동매매 플랫폼이다. 로컬 단독 사용이 전제다.

**현재 상태: 기획 중. 애플리케이션 코드 없음 (M0 이전).**

## 문서

| 파일 | 내용 |
|---|---|
| `docs/planning/plan.md` | 전체 기획: 기능, 아키텍처, 데이터 모델, 마일스톤(M0~M7), 확인 필요 항목 |
| `docs/planning/strategy.md` | 운영 전략: 워크플로(Mermaid), jev 배치, 위험 예산, 포지션 계획, 매도, 교체 매매, 평가 |
| `docs/planning/backlog.md` | 다음에 기획할 후보 목록 |
| `docs/planning/log.md` | 기획 결정 이력 |
| 시각화 문서 (Claude Docs) | https://claude.ai/code/artifact/a712f001-c5c0-4731-8015-d1bed440fac6 — 다이어그램 모음 |

기획 문서를 다룰 때는 `.claude/rules/planning.md`를 따른다.

## 용어

- **운영 시기**: 모의 운영 → 실전 운영 → 확장
- **개발 마일스톤**: M0 ~ M7 (`plan.md` 7장)
- "1단계", "2단계" 같은 "단계"라는 말은 쓰지 않는다. 두 체계가 섞여 혼란이 생긴 적이 있다.

## 기획 진행 방식

한 번에 하나씩 끝까지 닫는다. 세션 하나에서 백로그 항목 1~2개만 다룬다.

```
/backlog          백로그에서 다음 주제를 고른다 (또는 새 후보를 추린다)
   ↓
조사·논의          사실은 출처를 열어 확인. 확인 못 한 것은 "검증하지 않음" 또는 확인 필요 항목으로
   ↓
/spec <주제>      결정된 내용을 기획 문서에 반영 + 관련 문서 동기화 + log 기록 + 백로그 갱신
   ↓
/commit           docs: 커밋
```

- 논의 중 새 주제가 나오면 바로 파고들지 말고 **백로그에 추가**한다. 지금 주제를 먼저 닫는다.
- 대화가 길어지면 멈추고, 결정된 것만 `/spec`으로 반영한 뒤 나머지는 백로그에 남긴다.
- 사용자가 결정하지 않은 것은 문서에 "결정"으로 쓰지 않는다. 제안은 제안으로 적는다.

## 결정된 사항

바꾸려면 `log.md`에 이유와 함께 기록하고 관련 문서를 모두 고친다.

| 항목 | 결정 |
|---|---|
| 스택 | JDK 25, Kotlin 2.3+, Spring Boot 4.1, Gradle 9.1+, PostgreSQL + TimescaleDB, Docker Compose |
| 에디터 | Zed + Claude Code |
| 구조 | 모듈러 모놀리스, out 포트 헥사고날, 기능 우선 패키지 ([kopring-conventions](https://github.com/loading1031/kopring-conventions), M0에서 복사) |
| 영속성 | JPA + Kotlin JDSL. 시계열만 `JdbcClient` + SQL (명시적 예외) |
| 모듈 간 소통 | Spring 내부 이벤트 + Postgres Outbox. Kafka·Redis·R2DBC는 쓰지 않음 |
| 증권사·데이터 | KIS Open API (주문, 국내·해외 시세, 선물). 과거 일봉 백필은 KRX Open API |
| 판단 모델 | Ollama 결정 모델 jev(`nimble`). 판단만, 숫자는 코드, 한도는 규칙 |
| 테스트 | JUnit, 뮤테이션 테스트 PIT(변경분 실행) |

## 코드 작업 (M0 이후)

M0에서 kopring-conventions의 `.claude/`, `scripts/conventions/`, `.githooks/`, `docs/conventions`·`docs/architecture`를 복사하고 이 절을 갱신한다. 그 전에는 애플리케이션 코드를 쓰지 않는다.

## Git

- 커밋은 `/commit` 규칙을 따른다. 기획(`docs:`)과 코드 커밋을 섞지 않는다.
- 문서는 한국어로 쓴다.
