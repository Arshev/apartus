---
title: "FT-039: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-039. Mirrors FT-038 structure — второй консюмер FT-037."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_039_scope
  - ft_039_architecture
  - ft_039_acceptance_criteria
  - ft_039_blocker_state
---

# План имплементации

## Цель

Поставить второй консюмер FT-037 (`?currency=` на reports+dashboard, FinancialReportPdf currency awareness, FALLBACK_NOTICE pullup в BasePdf). Все 4 CHK зелёные, регрессий нет.

## Current State / Reference Points

| Path / module | Role | Reuse |
| --- | --- | --- |
| `backend/app/controllers/api/v1/reports_controller.rb` | Existing `financial` + `financial_pdf` actions. Собирают `total_revenue/expenses/net_income/adr/revpar` в org currency. | Add conversion branch (mirror FT-038 OwnersController#statement), new JSON fields. |
| `backend/app/controllers/api/v1/dashboard_controller.rb` | Existing `show` action. Возвращает `revenue_this_month` (cents) + `occupancy_rate` + `upcoming_check_ins/outs`. | Same conversion pattern; `effective_at = Date.current`. |
| `backend/app/services/pdf/base_pdf.rb` | FT-038 ввёл `fmt(cents, currency_override: nil)`. `FALLBACK_NOTICE` пока local в OwnerStatementPdf. | Pullup `FALLBACK_NOTICE` constant сюда (REQ-08). |
| `backend/app/services/pdf/owner_statement_pdf.rb` | FT-038 consumer — использует local `FALLBACK_NOTICE`. | Заменить на `BasePdf::FALLBACK_NOTICE`. CHK-03 regression. |
| `backend/app/services/pdf/financial_report_pdf.rb` | Existing consumer `fmt(cents)` без currency awareness. | Mirror OwnerStatementPdf pattern: `@override` + fallback row. |
| `frontend/src/api/reports.js` | `financial({params})` generic pass-through. | `currency` попадёт через `params` spread без изменений; добавить явный параметр в сигнатуру для читаемости. |
| `frontend/src/api/dashboard.js` | `get()` без params. | Переписать на `get(params = {})`. |
| `frontend/src/api/pdfExport.js` | `downloadFinancialReport(params)` — generic params. | Currency пролезает через params; явно задокументировать. |
| `frontend/src/views/ReportsView.vue` | Form c from/to + download PDF button. | +v-select Display Currency; watch → refetch JSON; передать в PDF download. |
| `frontend/src/views/DashboardView.vue` | Показывает KPIs + revenue chart. | +v-select; watch → refetch. |
| `backend/spec/requests/api/v1/reports_spec.rb` | Existing — покрывает financial JSON + PDF. | +FT-039 describe block с SC-01 + NEG-01..05. |
| `backend/spec/requests/api/v1/dashboard_spec.rb` | Existing. | +FT-039 describe с SC-02 + NEG-01..05. |
| `backend/spec/services/pdf/{financial_report_pdf,owner_statement_pdf}_spec.rb` | Existing coverage. | +currency override spec для financial; sanity для owner после FALLBACK_NOTICE pullup. |

## Test Strategy

| Surface | Canonical refs | Planned | Command |
| --- | --- | --- | --- |
| ReportsController#financial / #financial_pdf | REQ-01, REQ-03..06, REQ-09, CHK-01 | SC-01 (RUB→USD), NEG-01 (missing), NEG-02 (RateNotFound), NEG-03 (invalid), NEG-04 (permission), NEG-05 (multi-tenant) | rspec spec/requests/api/v1/reports_spec.rb |
| DashboardController#show | REQ-02..06, CHK-02 | SC-02 + NEG-01..04 | rspec spec/requests/api/v1/dashboard_spec.rb |
| FinancialReportPdf | REQ-07, EC-03, CHK-03 | Currency override, fallback row, zero-revenue, %PDF magic | rspec spec/services/pdf/financial_report_pdf_spec.rb |
| OwnerStatementPdf regression | REQ-08, EC-06, CHK-03 | FALLBACK_NOTICE pullup не ломает существующие specs | rspec spec/services/pdf/owner_statement_pdf_spec.rb |
| Full backend | EC-06, CHK-04 | Zero regressions | rspec |

## Open Questions

| OQ | Question | Default |
| --- | --- | --- |
| `OQ-01` | `occupancy_rate` в dashboard response — нужен ли passthrough (не конвертация) или не трогаем вообще? | Не трогаем — NS-04 покрывает. |
| `OQ-02` | Reports PDF sent with `response.content_type` — какой filename при currency override? | Оставить текущий `financial_report_<from>_<to>.pdf` (currency не в filename). Это cosmetic. |

## Environment Contract

- setup: bundle install + mise trust + master.key symlink (done).
- test: RSpec + FactoryBot + WebMock (from FT-037/038).
- frontend: yarn install + vite build.
- secrets: no new (use FT-037 credentials).

## Preconditions

| PRE | Ref | State |
| --- | --- | --- |
| `PRE-01` | feature.md | status: active |
| `PRE-02` | FT-037 + FT-038 | merged в main (confirmed) |

## Workstreams

| WS | Implements | Result |
| --- | --- | --- |
| `WS-1` Shared PDF refactor | REQ-08 | FALLBACK_NOTICE pullup → BasePdf; OwnerStatementPdf adapter; regression green |
| `WS-2` Reports backend | REQ-01, REQ-03..06, REQ-07 (financial_pdf) | Controller conversion + FinancialReportPdf currency override + specs |
| `WS-3` Dashboard backend | REQ-02..06 | Controller conversion + specs |
| `WS-4` Frontend | REQ-09, REQ-10 | ReportsView + DashboardView select + api/pdfExport pass-through + i18n |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Verifies | Check |
| --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | REQ-08 | FALLBACK_NOTICE pullup в BasePdf + OwnerStatementPdf adapter | `base_pdf.rb`, `owner_statement_pdf.rb`, `owner_statement_pdf_spec.rb` | CHK-03 (OwnerStatement regression) | `rspec spec/services/pdf/owner_statement_pdf_spec.rb` |
| `STEP-02` | agent | REQ-07 | FinancialReportPdf currency awareness (mirror OwnerStatementPdf pattern) | `financial_report_pdf.rb`, `financial_report_pdf_spec.rb` | CHK-03 | `rspec spec/services/pdf/financial_report_pdf_spec.rb` |
| `STEP-03` | agent | REQ-01, REQ-03..06 | ReportsController conversion branch в financial + financial_pdf | `reports_controller.rb`, `reports_spec.rb` | CHK-01 | `rspec spec/requests/api/v1/reports_spec.rb` |
| `STEP-04` | agent | REQ-02..06 | DashboardController conversion branch | `dashboard_controller.rb`, `dashboard_spec.rb` | CHK-02 | `rspec spec/requests/api/v1/dashboard_spec.rb` |
| `STEP-05` | agent | REQ-09 | ReportsView + DashboardView v-select + watch; api/dashboard.js переписан на `get(params)`; pdfExport currency passthrough | `ReportsView.vue`, `DashboardView.vue`, `api/dashboard.js`, `api/reports.js` (мин), `api/pdfExport.js` (мин) | end-to-end via manual smoke | `yarn build` + smoke |
| `STEP-06` | agent | REQ-10 | i18n keys — ru + en | `locales/ru.json`, `locales/en.json` | end-to-end | visual check |
| `STEP-07` | agent | CHK-04 | Full backend regression | — | CHK-04 | `rspec` |
| `STEP-08` | agent | all CHK | Collect evidence logs | `artifacts/ft-039/verify/chk-01..04/` | — | — |

## Parallelizable

- `PAR-01` STEP-03 + STEP-04 — independent (разные controllers), можно параллельно после STEP-02.
- `PAR-02` STEP-05 + STEP-06 — independent.

## Checkpoints

| CP | Condition |
| --- | --- |
| `CP-01` | STEP-01..02 done (PDF layer ready) |
| `CP-02` | STEP-03..04 done (backend API ready) |
| `CP-03` | STEP-05..06 done (frontend ready) |
| `CP-04` | STEP-07..08 done (evidence + regression) |

## Execution Risks

| ER | Risk | Mitigation |
| --- | --- | --- |
| `ER-01` | FALLBACK_NOTICE pullup ломает скрытый consumer | CHK-03 (OwnerStatementPdf) первым, spec-grep для других `FALLBACK_NOTICE` usage |
| `ER-02` | Controller duplicate boilerplate (FT-038 pattern повторяется в 2 controllers) | Рассмотреть private helper в BaseController или module если 3rd consumer появится. Для FT-039 — OK duplicate (cost/benefit) |
| `ER-03` | dashboard_spec существующий тест падает из-за нового поля `currency` в response | Если existing test использует `response.parsed_body.keys` exact match — обновить assertion на includes |

## Stop Conditions

| Stop | Trigger | Action |
| --- | --- | --- |
| `STOP-01` | CHK-03 OwnerStatementPdf регрессия | Revert STEP-01 pullup; duplicate const (FT-038 pattern + new FinancialReportPdf local) |

## Готово

- CHK-01..04 зелёные; EVID-01..04 собраны.
- Full backend 0 regressions.
- Frontend build ok + manual smoke.
- Code review + Codex review отдельным агентом.
