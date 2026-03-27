# Roadmap

This page gives you the full picture — every module, every task, time estimates, and a week-by-week schedule.

**Total estimated time: ~105 hours across 51 tasks.**

---

## Module 1. Introduction (~17h)

**Task 1. Repository Setup** ~2h
- Repository created with LICENSE, collaborators, README, and docker-compose
- Application starts locally
- Optional: system behavior documentation (actors, use cases, external systems, use case diagram)
- Optional: system architecture documentation (architecture style, tech stack, architecture diagram)

**Task 2. API CRUD** ~4h
- REST API with create and retrieve endpoints for at least one entity
- Entity persisted to a database

**Task 3. UI CRUD** ~4h
- Frontend with a form to create and a page to view entities
- UI calls the API (no direct database access)

**Task 4. External API Dependency** ~3h
- System calls at least one external REST API during a normal operation
- External API starts as part of docker-compose

**Task 5. Clock Dependency** ~2h
- System depends on a clock abstraction (not a direct system clock call)
- At least one operation uses the clock

**Task 6. Business Logic** ~2h
- At least one calculation using data from an external system
- At least one validation rule that rejects invalid input
- At least one status or state transition

---

## Module 2. Smoke Tests (~3h)

**Task 1. API Smoke Test** ~1h
- One smoke test for the API: hit the health/echo endpoint, assert success

**Task 2. UI Smoke Test** ~1h
- One smoke test for the UI: load the home page, assert it renders

**Task 3. External System Smoke Tests** ~1h
- One smoke test per external system: hit the health endpoint, assert success

---

## Module 3. E2E Tests (~12h)

**Task 1. Positive API Tests** ~2h
- Positive E2E tests that create, update, and retrieve an entity via API

**Task 2. Negative API Tests** ~2h
- Negative E2E tests for null/empty input, invalid type, and invalid range

**Task 3. Positive UI Tests** ~3h
- Positive E2E tests that create, update, and retrieve an entity via UI (Playwright)

**Task 4. Negative UI Tests** ~2h
- Negative E2E tests for null/empty, invalid type, and invalid range via UI

**Task 5. Parameterized Tests** ~1.5h
- At least one non-parameterized test and one parameterized test

**Task 6. External System Limitations** ~1.5h
- Tests showing controllable output (exact assert), uncontrollable output, and uncontrollable factor (clock)

---

## Module 4. Architecture — Clients (~6h)

**Task 1. System API Client** ~2h
- System API Client (e.g. `ShopApiClient`) with health check + all operations
- API smoke tests and API E2E tests refactored to use the client

**Task 2. System UI Client** ~2h
- System UI Client (e.g. `ShopUiClient`) with page objects
- UI smoke tests and UI E2E tests refactored to use the client

**Task 3. External System Clients** ~2h
- External System Clients (e.g. `ErpClient`, `TaxClient`) with health check + data operations
- External smoke tests and E2E tests refactored to use clients

---

## Module 5. Architecture — Drivers (~6h)

**Task 1. Shop Driver** ~2h
- `ShopDriver` interface + `ShopApiDriver` + `ShopUiDriver` implementations
- All shop tests (smoke + E2E) refactored to use driver interface

**Task 2. External System Drivers** ~2h
- `ErpDriver`, `TaxDriver` interfaces + implementations
- External tests (smoke + E2E) refactored to use driver interfaces

**Task 3. Base Driver Test** ~2h
- `BaseDriverTest` extracted; all test classes inherit
- Tests verified on both API and UI channels

---

## Module 6. Architecture — Channels (~3.5h)

**Task 1. System Smoke Tests** ~1.5h
- `ChannelType` enum with API and UI; `@Channel` annotation
- Smoke tests collapsed to single class — no base/subclass hierarchy

**Task 2. Primary E2E Test** ~1h
- Primary E2E test collapsed to single class with `@Channel` for both API and UI

**Task 3. Remaining E2E Tests** ~1h
- All remaining E2E tests collapsed to single classes with `@Channel`
- At least one test on both channels, at least one on a single channel
- Pipeline runs E2E Tests on API channel, then on UI channel

---

## Module 7. Architecture — Use Case DSL (~10h)

**Task 1. DSL Infrastructure + System Smoke Test** ~4h
- `UseCase`, `BaseUseCase`, `UseCaseContext`, verification classes, `UseCaseDsl`, `ShopDsl`, `BaseUseCaseDslTest`
- Smoke tests use `app.shop().goToShop().execute().shouldSucceed()`

**Task 2. External System DSLs + External Smoke Tests** ~2h
- `ErpDsl`, `TaxDsl` following `ShopDsl` pattern
- External smoke tests use `app.erp().goToErp().execute().shouldSucceed()`

**Task 3. System Use Cases + Primary E2E Test** ~2.5h
- System use cases added (e.g. PlaceOrder, ViewOrder, CancelOrder, coupons) + verifications
- External system use cases added as needed (e.g. ReturnsProduct on ErpDsl)
- Primary E2E test converted to DSL with aliases — no manual request construction

**Task 4. Remaining E2E Tests** ~1.5h
- All remaining E2E tests use DSL; `BaseUseCaseDslTest` exposes only `app`
- No direct driver references remain in test files

---

## Module 8. Architecture — Scenario DSL (~8h)

**Task 1. Smoke Tests** ~3h
- `ScenarioDsl`, `AssumeStage`, `ScenarioDslImpl`, `BaseScenarioDslTest`
- All smoke tests use `scenario.assume().*().shouldBeRunning()`

**Task 2. Given/When/Then Stages + Primary E2E Test** ~3h
- `GivenStage`, `WhenStage`, `ThenResultStage` with all steps
- Primary E2E test uses `scenario.given()...when()...then()` chain

**Task 3. Remaining E2E Tests** ~2h
- All remaining E2E tests use Scenario DSL; no Use Case DSL calls remain

---

## Module 9. Architecture — External Stubs (~8h)

**Task 1. WireMock Docker Setup** ~3h
- `ExternalSystemMode` enum; WireMock services in stub docker-compose
- Health check mappings; `docker compose up` succeeds

**Task 2. Stub Clients and Drivers** ~3h
- Stub client + stub driver for each external system (ERP, Tax, Clock)
- `ClockDriver` interface + real/stub drivers; system code updated to support REAL vs STUB clock
- `BaseConfigurableTest` reads mode from environment

**Task 3. Smoke Tests in Both Modes** ~2h
- `ClockSmokeTest` added
- All smoke tests pass in both STUB and REAL modes
- E2E tests run in REAL mode only
- Pipeline Acceptance Stage updated to run in both STUB and REAL modes

---

## Module 10. Acceptance Tests (~8h)

**Task 1. Primary Acceptance Test** ~2h
- `BaseAcceptanceTest` with `ExternalSystemMode.STUB`
- Primary use case positive test class with migrated scenario

**Task 2. Remaining Acceptance Tests** ~3h
- Remaining use case test classes (e.g. ViewOrder, CancelOrder, PublishCoupon, BrowseCoupons)
- All acceptance tests pass
- Pipeline runs Acceptance Tests (STUB) before E2E Tests (REAL)

**Task 3. Stub-Only Scenarios** ~1.5h
- Scenarios configuring exact stub values (tax rate) and asserting exact outcomes (total price)

---

## Module 11. Contract Tests (~6h)

**Task 1. Real Contract Tests** ~2h
- Base contract test with shared scenarios; real subclass runs against real system

**Task 2. Stub Contract Tests** ~2h
- Stub subclass runs same scenarios against WireMock; both modes pass

**Task 3. E2E Tests Cleanup** ~2h
- Delete E2E tests covered by acceptance + contract tests
- Only a simplified primary E2E test remains — verifies success against real systems, no business logic assertions

---

## Module 12. ATDD — Acceptance Criteria (~4h)

**Task 1. Three Amigos Session** ~1.5h
- Roleplay transcript for a new feature; concrete rules produced

**Task 2. Main Success Acceptance Criterion** ~1h
- Gherkin scenario for the main success path of a new use case, with specific values

**Task 3. Alternative + Error Acceptance Criteria** ~1h
- Gherkin scenarios for alternative paths and error cases of the same use case

**Task 4. Bug Acceptance Criterion** ~0.5h
- Convert a bug report into a Gherkin scenario that reproduces the defect

---

## Module 13. ATDD — Acceptance Tests (~7h)

**Task 1. Main Success — RED + GREEN (no DSL change)** ~2h
- Acceptance test for the main success criterion — existing DSL already supports it
- RED: test written and committed (disabled); GREEN: system implemented, test passes

**Task 2. Alternative Path — RED + GREEN (DSL change needed)** ~3h
- Acceptance test for an alternative path — requires new DSL steps, driver methods, or both
- RED: test + DSL + driver committed (disabled); GREEN: system implemented, test passes

**Task 3. Error Case — RED + GREEN** ~1h
- Acceptance test for an error case from the acceptance criteria

**Task 4. Bug Fix** ~1h
- Bug reproduced as a failing acceptance test, fixed, test passes

---

## Module 14. ATDD — Contract Tests (~3h)

**Task 1. Contract Test — RED** ~1h
- Contract test passes against real, fails against stub

**Task 2. Contract Test — GREEN** ~1h
- Stub updated; contract test passes both modes

**Task 3. Complete the ATDD Cycle** ~1h
- Acceptance test that triggered the subprocess now passes

---

## Module 15. Structural Changes (~5h)

**Task 1. UX/UI Redesign** ~2h
- UI change made; API tests unchanged; UI tests fail then pass after UI driver-only update

**Task 2. System API Redesign** ~1.5h
- API endpoint/contract changed; UI tests unchanged; API tests fail then pass after API driver-only update

**Task 3. External System API Redesign** ~1.5h
- External system API contract changed; tests unchanged; external system driver updated to match new contract

---

## Time Summary

| Module | Tasks | Hours |
|--------|:-----:|------:|
| 1. Introduction | 6 | 17 |
| 2. Smoke Tests | 3 | 3 |
| 3. E2E Tests | 6 | 12 |
| 4. Clients | 3 | 6 |
| 5. Drivers | 3 | 6 |
| 6. Channels | 3 | 3.5 |
| 7. Use Case DSL | 4 | 10 |
| 8. Scenario DSL | 3 | 8 |
| 9. External Stubs | 3 | 8 |
| 10. Acceptance Tests | 3 | 6.5 |
| 11. Contract Tests | 3 | 6 |
| 12. Acceptance Criteria | 4 | 4 |
| 13. ATDD Tests | 4 | 7 |
| 14. Contract ATDD | 3 | 3 |
| 15. Structural Changes | 3 | 5 |
| **Total** | **51** | **~105** |

---

## 22-Week Schedule (5.5 months, ~5 hours/week)

| Week | Module | Tasks | Hours |
|:----:|--------|-------|------:|
| 1 | 1. Introduction | Tasks 1–2 (Repo + API CRUD) | 6 |
| 2 | 1. Introduction | Tasks 3–4 (UI CRUD + External API) | 7 |
| 3 | 1. Introduction | Tasks 5–6 (Clock + Business Logic) | 4 |
| 3 | 2. Smoke Tests | All tasks | 3 |
| 4 | 3. E2E Tests | Tasks 1–2 (Positive + Negative API) | 4 |
| 5 | 3. E2E Tests | Tasks 3–4 (Positive + Negative UI) | 5 |
| 6 | 3. E2E Tests | Tasks 5–6 (Parameterized + Limitations) | 3 |
| 6 | 4. Clients | Task 1 (System API Client) | 2 |
| 7 | 4. Clients | Task 2 (System UI Client) | 2 |
| 7 | 4. Clients | Task 3 (External System Clients) | 2 |
| 8 | 5. Drivers | Task 1 (Shop Driver) | 2 |
| 8 | 5. Drivers | Task 2 (External System Drivers) | 2 |
| 9 | 5. Drivers | Task 3 (Base Driver Test) | 2 |
| 9 | 6. Channels | Task 1 (Smoke Tests) | 1.5 |
| 9 | 6. Channels | Tasks 2–3 (Primary + Remaining E2E) | 2 |
| 10 | 7. Use Case DSL | Task 1 (DSL Infrastructure) | 4 |
| 11 | 7. Use Case DSL | Tasks 2–3 (External DSLs + Primary E2E) | 4.5 |
| 12 | 7. Use Case DSL | Task 4 (Remaining E2E) | 1.5 |
| 12 | 8. Scenario DSL | Task 1 (Smoke Tests) | 3 |
| 13 | 8. Scenario DSL | Task 2 (Primary E2E) | 3 |
| 13 | 8. Scenario DSL | Task 3 (Remaining E2E) | 2 |
| 14 | 9. External Stubs | Task 1 (WireMock Setup) | 3 |
| 14 | 9. External Stubs | Task 2 (Stub Clients + Drivers) | 3 |
| 15 | 9. External Stubs | Task 3 (Both Modes) | 2 |
| 15 | 10. Acceptance Tests | Task 1 (Primary) | 2 |
| 16 | 10. Acceptance Tests | Tasks 2–3 (Remaining + Stub Scenarios) | 4.5 |
| 17 | 11. Contract Tests | Task 1 (Real) | 2 |
| 17 | 11. Contract Tests | Tasks 2–3 (Stub + Cleanup) | 4 |
| 18 | 12. Acceptance Criteria | All tasks | 4 |
| 19 | 13. ATDD Tests | Tasks 1–2 (Main Success + Alternative Path) | 5 |
| 20 | 13. ATDD Tests | Tasks 3–4 (Error Case + Bug Fix) | 2 |
| 20 | 14. Contract ATDD | All tasks | 3 |
| 21 | 15. Structural Changes | Task 1 (UX/UI Redesign) | 2 |
| 21 | 15. Structural Changes | Task 2 (System API Redesign) | 1.5 |
| 22 | 15. Structural Changes | Task 3 (External System API Redesign) | 1.5 |

**Pace: ~5 hours/week for 22 weeks (5.5 months).**

Weeks 1–3 are system building — you start from scratch and end with a working application. Weeks 6–14 are the Architecture Valley — the longest stretch where you restructure code without writing new tests. Stay the course: the payoff arrives in Module 10 when you can assert exact tax amounts and total prices for the first time.
