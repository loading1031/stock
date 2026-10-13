# M0 설계: Claude·빌드 기반

- 작성일: 2026-10-13
- 상태: 확정 (B-01, 2026-10-13). M0 구현은 아래 "M0 구현 체크리스트"로 한다
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
| PIT 대상과 기준 | `domain`과 `application/service`만. 점수 기준선(`mutationThreshold`)은 걸지 않고 보고만 한다 (2026-10-10 log.md 결정을 2026-10-13 재확인) | `adapter`는 통합 테스트로 확인하고 뮤턴트마다 컨테이너를 띄우면 너무 느리다. 바뀐 클래스만 돌리면 뮤턴트 수가 적어 비율이 크게 흔들린다 |
| 살아남은 뮤턴트 처리 | 4분류: ① 테스트 부족 → 테스트 추가 ② 동등 뮤턴트 → 이유 기록 ③ 쓸모없는 코드 → 사용자 확인 후 삭제 ④ 보류 → 이유 기록. 작업을 마칠 때 미분류 0개. ②④의 이유는 커밋 메시지 본문에 | 별도 파일로 관리하면 코드가 바뀔 때 어긋난다 |
| Docker Compose | TimescaleDB `timescale/timescaledb:2.26.1-pg18`만. 이름 있는 볼륨, 포트는 `127.0.0.1:5432`. `spring-boot-docker-compose`로 `bootRun` 때 자동 실행, 테스트는 Testcontainers | 로컬 단독 사용 |
| Ollama (jev) | Compose에 넣지 않고 Mac에서 직접 실행 | Mac의 Docker 컨테이너는 Apple GPU를 쓰지 못한다고 알려져 있다(**검증하지 않음**) |
| Flyway 초기 범위 | V1은 TimescaleDB 확장만. 테이블은 그 기능의 마일스톤에서(인증 M1, 주문·이벤트 기록 M3) | |
| DB 계정 | M0부터 Flyway(소유자) 계정과 앱 계정을 나눈다. Compose의 DB 초기화 스크립트로 만든다 | plan.md 4.6의 삭제 금지 장치. 테이블이 없는 지금이 가장 쉽다 |
| 코드 브랜치 | `<종류>/M<번호>-<slug>`(예: `feat/M1-auth`). 종류는 커밋 접두어와 같다. B-18(이슈 이전) 뒤에는 `<종류>/<이슈 번호>-<slug>` | |
| 코드 브랜치와 기획 문서 | 코드 브랜치에서는 `docs/planning/`을 고치지 않는다. 설계를 바꿔야 하면 기획 브랜치를 따로 연다. CLAUDE.md "코드 작업" 절만 코드 브랜치에서 `chore:`로 고친다 | 기획과 코드 커밋을 섞지 않는다(CLAUDE.md Git) |
| 커밋과 이슈 | 커밋 본문 끝에 `Refs: #<이슈 번호>` trailer. 이슈는 PR 본문의 `Closes #<번호>`로 닫는다(커밋에는 쓰지 않는다) | 커밋에서 작업 기록(이슈)으로 바로 간다. 커밋의 `Closes`는 중간 커밋이 `main`에 들어갈 때 이슈를 닫아 버린다 |
| 합치기 조건 | `./gradlew test`(ArchUnit 포함) 통과, 바뀐 클래스의 살아남은 뮤턴트 미분류 0, pre-commit 훅 통과. PR로 합친다 | |
| 합치는 방식 | `--no-ff` 머지 커밋 (기획 브랜치와 같음) | 작업 하나를 머지 커밋 하나로 통째로 되돌릴 수 있다. 추적은 PR·이슈와 커밋의 `Refs:`로도 된다 |
| 컨텍스트 로딩 테스트 | `@SpringBootTest` + `@Import(TestcontainersConfig)`. 설정 클래스 하나가 TimescaleDB 컨테이너를 `@ServiceConnection` 빈으로 두고 통합 테스트가 함께 쓴다. 빈 연결, Flyway V1, Hibernate `validate`, 앱이 앱 계정으로 접속하는지 확인 | kopring 테스트 컨벤션 1절. 실험 프로젝트에서 같은 구성이 동작했다 |
| 샘플 도메인 클래스 | `order/domain/TickSize`: 가격이 호가 단위에 맞는지, 가장 가까운 유효 가격. 순수 함수 + 단위 테스트 | M3 주문 검증에 실제로 쓴다. 구간 경계가 많아 PIT 경계 뮤턴트 확인에 좋다 |
| ArchUnit 첫 모양 | `ArchitectureTest` 하나에 "ArchUnit으로 검사할 것"의 규칙을 처음부터 모두 넣는다. 검사 대상이 빈 규칙은 허용(`archRule.failOnEmptyShould=false`) | 코드가 적을 때 넣어야 위반 없이 시작한다. M0에는 기능이 `order` 하나뿐이다 |
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

- `pitestChanged` 태스크(plan.md 7장 M0 완료 기준): 아래를 계산해 `-PpitTargets`로 `pitest`를 부르는 Gradle 태스크다. 결정(2026-10-13).
  - 비교 기준: 커밋하지 않은 변경 + `git diff main...HEAD`
  - 대상: 바뀐 main `.kt` 중 `domain`·`application/service` 패키지의 클래스. 테스트 파일만 바뀌면 `FooTest` → 같은 패키지의 `Foo`
  - 바뀐 클래스가 없으면 PIT를 건너뛰고 성공으로 끝낸다
- 위 블록의 기본값 `com.loading1031.stock.*`는 `pitest`를 직접 부를 때만 쓴다.

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

order/application/service/OrderService ──발행──→ order/domain/event/OrderFinished
portfolio/adapter/in/messaging/OrderFinishedListener ──수신──→ OrderFinished
```

ArchUnit으로 검사할 것:
- 기능 안: `domain`은 바깥 계층을 모른다, `application`은 `adapter`를 모른다, `adapter.in`과 `adapter.out`은 서로 모른다, `adapter.out`은 `application.service`를 부르지 않는다
- 기능 사이: 다른 기능 참조는 `adapter/out` → 상대 `application/service`, `adapter/in/messaging` → 상대 `domain/event`만
- `slices().matching("com.loading1031.stock.(*)..").should().beFreeOfCycles()`

### 모듈 간 이벤트: Modulith 이벤트 발행 기록

- 이벤트 기록은 업무 트랜잭션 안에서 쓴다. 리스너(`@ApplicationModuleListener` = 비동기 + 새 트랜잭션 + 커밋 후)는 따로 돈다.
- 리스너가 비동기라 처리 순서는 보장되지 않는다. 그래서 **리스너는 이벤트를 "끝난 주문이 있다"는 신호로만 쓰고**, 계좌를 잠근 뒤 아직 반영하지 않은 끝난 주문을 끝난 시각 순으로 반영한다(plan.md 4.6).
- **제안:** 이벤트 기록 테이블 DDL은 Flyway 마이그레이션에 넣고 자동 생성(`spring.modulith.events.jdbc.schema-initialization.enabled`)은 끈다. 완료 기록 정리(`completion-mode`)와 재전송 방식(재시작 시 / 주기 작업)은 M3에서 정한다.
- 나중에 Kafka로 내보낼 때는 `@Externalized`를 쓴다(plan.md 6장 "Kafka 도입 조건"과 같은 경로).

### M0 구현 체크리스트

M0 구현 세션은 코드 브랜치 `feat/M0-foundation`에서 이 순서로 한다. 버전은 위 "확인한 버전" 표.

**만들 파일**

| 파일 | 내용 |
|---|---|
| `settings.gradle.kts` | `rootProject.name = "stock"`, foojay 툴체인 리졸버 1.0.0 |
| `build.gradle.kts` | Kotlin 2.3.21(`jvm`, `plugin.spring`, `plugin.jpa`), Boot 4.1.1, dependency-management, JDK 25 툴체인, `-Xjsr305=strict`. 의존성: data-jpa, flyway + `flyway-database-postgresql`, Kotlin JDSL 3.9.0(`jpql-dsl`, `jpql-render`, `spring-data-jpa-support`), postgresql, `spring-boot-docker-compose`(developmentOnly), 테스트: starter-test, `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter`, `archunit-junit5` 1.5.1, `kotlin-test-junit5`. gradle-pitest-plugin 1.19.0 설정(위 "PIT 설정")과 `pitestChanged` 태스크 |
| Gradle wrapper | `gradle wrapper --gradle-version 9.8.1` |
| `compose.yaml` | `timescale/timescaledb:2.26.1-pg18`, 이름 있는 볼륨, `127.0.0.1:5432:5432`, 초기화 스크립트 마운트 |
| `docker/postgres/init/01-roles.sql` | 소유자 계정(Flyway)과 앱 계정. 앱 계정에는 접속·사용 권한과 앞으로 만들 테이블의 기본 권한만 |
| `.env.example` | 두 계정의 비밀번호 자리(값 없음). 실제 값은 `.env`(커밋 안 함) |
| `src/main/resources/application.yml` | `spring.jpa.hibernate.ddl-auto: validate`, `open-in-view: false`, Flyway는 소유자 계정(`spring.flyway.user`), 데이터소스는 앱 계정 |
| `src/main/resources/db/migration/V1__timescaledb.sql` | `CREATE EXTENSION IF NOT EXISTS timescaledb;` |
| `src/main/kotlin/com/loading1031/stock/StockApplication.kt` | `@SpringBootApplication`, `@ConfigurationPropertiesScan` |
| `…/order/domain/TickSize.kt` + `src/test/…/order/domain/TickSizeTest.kt` | 샘플 도메인. 경계값 테스트 |
| `src/test/…/TestcontainersConfig.kt`, `ApplicationContextTest.kt` | 컨텍스트 로딩 테스트. 테스트 컨테이너에도 두 계정을 만든다(같은 초기화 스크립트) |
| `src/test/…/ArchitectureTest.kt`, `src/test/resources/archunit.properties` | ArchUnit 규칙, `archRule.failOnEmptyShould=false` |
| `/kopring:init hexagonal`이 만드는 것 | CLAUDE.md 컨벤션 선언, `.githooks/pre-commit`. 실행 뒤 `git config core.hooksPath .githooks` |

**실행할 명령과 확인 방법**

| 명령 | 확인 |
|---|---|
| `./gradlew test` | 전부 통과. 컨텍스트 로딩 테스트에서 `current_user`가 앱 계정 |
| `./gradlew pitestChanged` (TickSize만 고친 상태) | TickSize만 대상이 되고, 살아남은 뮤턴트를 4분류해 미분류 0 |
| `./gradlew pitestChanged` (아무것도 안 고친 상태) | PIT를 건너뛰고 성공 |
| `./gradlew bootRun` | Compose로 DB가 자동으로 뜨고 앱이 시작됨. `127.0.0.1`에서만 접속됨 |
| `.kt` 파일에 `Instant.now()`를 쓰려고 함 | kopring 훅이 `time/inject-clock`으로 막음 |
| `git commit` | pre-commit 훅이 `.kt` 파일을 검사 |

**구현 전에 확인할 것**
- KRX 호가 단위 구간(2023년 개편안으로 알고 있음, **검증하지 않음**). KRX 공식 출처로 확인한 뒤 TickSize를 쓴다
- ArchUnit `archRule.failOnEmptyShould`의 기본값과 설정 위치(**검증하지 않음**)

## 데이터 모델 영향

- `outbox` 테이블 → Modulith 이벤트 기록 테이블(`event_publication`)로 바뀐다.
- 주문·체결 정합성에 따른 변경(`executions` 누적 상태, `order_holds`, `orders.ledger_status`, 끝난 주문 단위 `cash_ledger`)은 plan.md 4.6·5장.
- 테이블 이름 규칙(기능 접두어, `cash_tx`)과 잔고 구조는 [backlog.md](backlog.md) B-17에서 정한다.

## 다른 문서에 반영할 곳

- 반영함: plan.md 2장·3.4·3.5·3.7·4.2·4.3·4.5·4.6·5장·7장·8장, CLAUDE.md 결정된 사항·Git·플러그인
- 남음: 시각화 문서 "아키텍처"·"데이터 모델"·"주문·체결 흐름" (backlog.md 동기화 빚)

## 확인이 필요한 것

- [ ] KRX 호가 단위 구간 (TickSize 구현 전)
- [ ] ArchUnit `archRule.failOnEmptyShould` 기본값과 설정 위치
- [ ] Mac Docker에서 Ollama가 GPU를 못 쓰는지
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
