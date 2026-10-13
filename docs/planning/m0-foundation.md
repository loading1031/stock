# M0 설계: Claude·빌드 기반

- 작성일: 2026-10-13
- 상태: 초안 (B-01 진행 중. 작업지시서 "정할 것" 1~4번 결정, 5~8번 남음)
- 관계: [plan.md](plan.md) 2장(스택)·4장(아키텍처)·7장 M0의 상세. 관련 문서: [work-orders.md](work-orders.md) B-01

## 결론

M0 스택을 실험 프로젝트로 직접 돌려 확인했다. Boot 4.1.1, Kotlin 2.3.21, JDK 25, JUnit 6, PIT, JDSL, TimescaleDB, Zed Kotlin LSP가 함께 동작한다. 단일 Gradle 모듈에 기능별 패키지를 두고 경계는 ArchUnit으로 검사한다. 모듈 간 이벤트는 직접 만들려던 Outbox 대신 Spring Modulith 이벤트 발행 기록을 쓴다.

## 결정 사항

| 항목 | 결정 | 이유 |
|---|---|---|
| Gradle 구조 | 단일 모듈 + 기능 우선 패키지. 경계는 ArchUnit으로 검사 | 혼자 쓰는 프로젝트이고 기능 경계가 아직 바뀔 수 있다. 굳으면 패키지를 모듈로 떼기 쉽다 |
| 기본 패키지 | `com.loading1031.stock` | |
| PIT 변경분 실행 | `git diff`로 바뀐 main `.kt` 파일 → 클래스 패턴 → `-PpitTargets=…` → `targetClasses`. Arcmutate는 쓰지 않는다 | pitest 1.30 오픈소스판은 증분 분석(history)을 켜면 "history plugin 없음"으로 실패한다. 증분 분석은 Arcmutate Pro(사용자당 월 $12) 기능이다 |
| PIT 기본 설정 | `avoidCallsTo = setOf("kotlin.jvm.internal")` | 살아남은 뮤턴트가 모두 Kotlin 컴파일러가 넣은 null 검사(`Intrinsics.checkNotNullExpressionValue`)였다 |
| 시각·소수·비밀값 규칙 | kopring 범용 규칙 4개: `time/inject-clock`, `bigdecimal/rounding-mode`, `bigdecimal/no-double-ctor`, `log/no-secret` | 도메인과 무관하게 맞는 규칙이라 opt-in 장치 없이 범용으로 둔다. 금액 필드 이름 검사는 오탐만 늘어 뺐다 |
| `JdbcClient` | `arch/tech-client-outside-adapter` 대상에 추가 (`adapter/out`·`config`에서만) | `JdbcTemplate`과 같은 취급. SQL이 업무 코드에 섞이지 않게 한다 |
| 시계열 영속성 | 읽기·쓰기 모두 SQL. 조회는 `JdbcClient`, 일괄 삽입은 `NamedParameterJdbcTemplate` | Spring 7.0.9의 `JdbcClient`에는 배치가 없다. JPA 쓰기·Exposed·jOOQ는 쓰지 않는다(아래 실험) |
| 기능 사이 의존 | 다른 기능은 두 곳에서만 참조한다. ① `adapter/out`: 부르는 쪽 포트를 구현하며 상대의 `application/service` 호출 ② `adapter/in/messaging` 리스너: 상대의 `domain/event` 수신. 기능 간 순환 금지. 반대 방향은 이벤트로 | 업무 코드가 다른 기능의 내부를 모르고, 분리할 때 어댑터만 바뀐다 |
| 구조 검사 도구 | ArchUnit 직접 작성 (계층 규칙 + 기능 사이 규칙 + 순환 금지) | Modulith `verify()`는 서비스가 다른 기능의 서비스를 직접 import해도 통과시켰고, 공개 클래스마다 `@NamedInterface` 표시가 필요하다 |
| 모듈 간 이벤트 | Postgres Outbox 대신 **Spring Modulith 이벤트 발행 기록** (`spring-modulith-starter-jdbc`, PostgreSQL) | 같은 트랜잭션에 기록, 롤백이면 기록 없음, 리스너 실패 시 미완료로 남아 재전송 가능(실험). Outbox·릴레이·재전송을 직접 만들 필요가 없다 |

## 상세

### 확인한 버전 (2026-10-11 ~ 13)

| 구성 | 버전 | 확인 방법 |
|---|---|---|
| Spring Boot | 4.1.1 (최신 4.1 패치. 4.2는 M2) | Maven Central |
| Spring Framework | 7.0.9 | Boot BOM |
| Kotlin | 2.3.21 | Boot BOM |
| Hibernate ORM | 7.4.5.Final | Boot BOM, 실행 로그 |
| JUnit Jupiter | 6.0.3 | Boot BOM |
| Flyway | 12.4.0 | Boot BOM, 실행 로그 |
| Gradle | 9.8.1 | services.gradle.org |
| JDK | Temurin 25.0.4.1 (Gradle 툴체인이 `~/.gradle/jdks`에 받음) | 실행 로그 |
| pitest / pitest-junit5-plugin / gradle-pitest-plugin | 1.30.0 / 1.2.3 / 1.19.0 | Maven Central, Gradle 플러그인 포털 |
| Kotlin JDSL | 3.9.0 | GitHub 릴리스 |
| TimescaleDB 이미지 | `timescale/timescaledb:2.26.1-pg18` (PostgreSQL 18.3). `latest` 태그는 없다 | Docker Hub, 실행 로그 |
| Spring Modulith | 2.1.1 (Boot 4.1.1 기준) | Maven Central POM |
| ArchUnit | 1.5.1 | Maven Central |
| Zed Kotlin LSP | JetBrains `kotlin-lsp` 263.6379.0 (JBR 25.0.4.1 내장) | 설치된 확장 |

### 실험 결과

실험 프로젝트는 저장소 밖(`/tmp/stock-spike`)에서 만들었다. 애플리케이션 코드가 아니다.

| 실험 | 결과 |
|---|---|
| JUnit 6 + PIT | JUnit 6.0.3에서 뮤턴트를 만들고 테스트를 돌린다 |
| PIT 증분 분석 | `enableDefaultIncrementalAnalysis` → 실패("history plugin" 필요) |
| PIT git diff 대상 지정 | 바뀐 클래스 하나만 돈다 |
| Flyway + Hibernate `validate` | V1 마이그레이션(하이퍼테이블 포함) 적용 후 검사 통과 |
| JDSL 조회 | `KotlinJdslJpqlExecutor`로 조회 통과 |
| `JdbcClient` + `time_bucket` | 1분봉 10행 → 5분 구간 2개 |
| Zed Kotlin LSP | 프로젝트를 약 44초에 읽음. 진단 0건, JDSL·JDK·Spring 타입 hover 정상 (언어 서버에 LSP 요청을 직접 보내 확인. Zed 화면은 보지 않음) |
| JPA로 하이퍼테이블 1,000행 | 그냥 `saveAll`은 SQL 1,001개(행마다 `SELECT` 먼저). `Persistable(isNew=true)` + `batch_size=500`이면 1개. 압축된 구간에도 삽입됨 |
| `JdbcClient` vs Exposed 1.5.1 (1만 행) | 기능은 둘 다 통과(일괄 삽입, 중복 건너뛰기, 기간 조회, `time_bucket`) |
| Exposed + JPA 트랜잭션 | 스타터 없이: JPA 롤백 때 Exposed로 쓴 행이 남음. `exposed-spring-boot4-starter`: `JpaTransactionManager`가 사라져 JPA 테스트 실패 |
| Modulith 구조 검사 | 기본 상태는 기능 사이 참조를 모두 막음. `@NamedInterface` 표시 후 통과, 순환은 잡음, 서비스 직접 참조는 못 잡음 |
| Modulith 이벤트 기록 | 커밋 → 기록 후 완료 표시. 롤백 → 기록 없음. 리스너 실패 → 미완료로 남고 `resubmitIncompletePublications` 후 완료 |

### PIT 설정 (제안 포함)

```kotlin
pitest {
    pitestVersion = "1.30.0"
    junit5PluginVersion = "1.2.3"
    targetClasses = providers.gradleProperty("pitTargets")
        .map { it.split(",").toSet() }
        .orElse(setOf("com.loading1031.stock.*"))
    avoidCallsTo = setOf("kotlin.jvm.internal")
}
```

- **제안:** 테스트 파일만 바뀌면 `FooTest` → 같은 패키지의 `Foo`를 대상에 넣는다. 비교 기준은 커밋하지 않은 변경 + `git diff main...HEAD`. 바뀐 클래스가 없으면 PIT를 건너뛰고 성공으로 끝낸다.
- 대상 패키지와 살아남은 뮤턴트 처리 규칙은 아직 정하지 않았다(작업지시서 5번).

### 시각·소수·비밀값 규칙

kopring 플러그인 0.2.0(`~/Documents/claude-plugins`, 커밋 `56c54ed`). 근거와 한계는 플러그인의 `docs/conventions/values.md`.

| rule id | 막는 것 |
|---|---|
| `time/inject-clock` | 인자가 없거나 시간대만 넘긴 `Instant.now()`, `LocalDateTime.now(zone)` 등 (테스트·`config` 제외) |
| `bigdecimal/rounding-mode` | `RoundingMode`·`MathContext` 없는 `divide(x)`, `setScale(n)` |
| `bigdecimal/no-double-ctor` | `BigDecimal(0.1)`, `BigDecimal(x.toDouble())` |
| `log/no-secret` | 로그 호출의 템플릿·인자에 `appSecret`, `password`, `accessToken` 등 |

- Kotlin `a / b`(`BigDecimal.div`)는 예외 없이 `a`의 자릿수로 자른다. 줄 단위 검사로는 못 잡는다.
- 금액 라이브러리 Moneta도 반올림을 자동으로 하지 않는다. `Money.of(10000, "KRW").divide(3)`은 소수 수백 자리 그대로다(jshell로 확인).
- 비밀값 처리는 B-10에서 정한다. 로그 규칙은 보조 그물이다.

### 기능 사이 의존 (예)

```
risk/application/service/RiskCheckService ──사용──→ risk/application/port/out/LoadHoldingsPort
risk/adapter/out/portfolio/HoldingsAdapter ──구현──→ LoadHoldingsPort
                                            ──호출──→ portfolio/application/service/HoldingsQueryService

order/application/service/OrderService ──발행──→ order/domain/event/OrderFilled
portfolio/adapter/in/messaging/OrderFilledListener ──수신──→ OrderFilled
```

ArchUnit으로 검사할 것:
- 기능 안: `domain`은 바깥 계층을 모른다, `application`은 `adapter`를 모른다, `adapter.in`과 `adapter.out`은 서로 모른다, `adapter.out`은 `application.service`를 부르지 않는다
- 기능 사이: 다른 기능 참조는 `adapter/out` → 상대 `application/service`, `adapter/in/messaging` → 상대 `domain/event`만
- `slices().matching("com.loading1031.stock.(*)..").should().beFreeOfCycles()`

### 모듈 간 이벤트: Modulith 이벤트 발행 기록

- 이벤트 기록은 업무 트랜잭션 안에서 쓴다. 리스너(`@ApplicationModuleListener` = 비동기 + 새 트랜잭션 + 커밋 후)는 따로 돈다.
- 리스너가 비동기라 처리 순서는 보장되지 않는다. 그래서 **리스너는 이벤트를 "새 체결이 있다"는 신호로만 쓰고**, 계좌를 잠근 뒤 아직 반영하지 않은 체결을 id 순으로 반영한다(plan.md 4.6 제안).
- **제안:** 이벤트 기록 테이블 DDL은 Flyway 마이그레이션에 넣고 자동 생성(`spring.modulith.events.jdbc.schema-initialization.enabled`)은 끈다. 완료 기록 정리(`completion-mode`)와 재전송 방식(재시작 시 / 주기 작업)은 M3에서 정한다.
- 나중에 Kafka로 내보낼 때는 `@Externalized`를 쓴다(plan.md 6장 "Kafka 도입 조건"과 같은 경로).

## 데이터 모델 영향

- `outbox` 테이블 → Modulith 이벤트 기록 테이블(`event_publication`)로 바뀐다.
- 테이블 이름 규칙(기능 접두어, `cash_tx`)과 잔고 구조는 [backlog.md](backlog.md) B-17에서 정한다.

## 다른 문서에 반영할 곳

- plan.md 2장: Hibernate 7.4, 영속성 줄
- plan.md 4.2·4.3·4.6, 5장 `outbox`, 7장 M0·M3
- CLAUDE.md 결정된 사항: 구조, 영속성, 모듈 간 소통
- 시각화 문서 "아키텍처"·"데이터 모델": 동기화 빚

## 확인이 필요한 것

- [ ] 작업지시서 5번 나머지: PIT 대상 패키지, 살아남은 뮤턴트 처리 규칙
- [ ] 작업지시서 6번: Docker Compose 구성, Flyway 초기 마이그레이션 범위
- [ ] 작업지시서 7번: 코드 브랜치 규칙
- [ ] 작업지시서 8번: 컨텍스트 로딩 테스트와 샘플 도메인 클래스
- [ ] Gradle 경고 `Configuration.setVisible` 사용 중단(Gradle 11에서 제거)이 어느 플러그인에서 나오는지
- [ ] Modulith 리스너를 동기(`@TransactionalEventListener`만)로 두면 처리 순서가 지켜지는지 (시험하지 않음)
- [ ] Boot 4.2(Spring 7.1) 정식 출시 후 `JdbcClient` 배치 API로 일괄 삽입을 옮길지. 7.1 RC1에서 API가 바뀐다(spring-framework #37341)
- [ ] kopring 플러그인 0.2.0이 Claude Code 재시작 후 적용되는지

## 출처

- [Spring Boot 4.1.1 available now](https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now/)
- [pitest-junit5-plugin](https://github.com/pitest/pitest-junit5-plugin)
- [ArcMutate](https://www.arcmutate.com/) — 요금(Base $8, Pro $12 사용자당 월), "Free for Open Source"
- [timescale/timescaledb 태그](https://hub.docker.com/r/timescale/timescaledb/tags)
- [Spring Modulith — Events](https://docs.spring.io/spring-modulith/reference/events.html)
- [Spring Modulith — Fundamentals](https://docs.spring.io/spring-modulith/reference/fundamentals.html)
- [spring-framework #37216 JdbcClient 배치 지원](https://github.com/spring-projects/spring-framework/issues/37216), [#37341](https://github.com/spring-projects/spring-framework/issues/37341)
- [jOOQ 다운로드(에디션별 지원 DB)](https://www.jooq.org/download/)
- [Hypersistence Utils](https://github.com/vladmihalcea/hypersistence-utils), [HHH-9674](https://hibernate.atlassian.net/browse/HHH-9674)
