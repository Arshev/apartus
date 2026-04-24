---
title: "FT-039: Report Display Currency"
doc_kind: feature
doc_function: canonical
purpose: "Второй консюмер FT-037: financial reports + dashboard JSON и PDF в произвольной display-валюте через `?currency=<ISO>` query param. Reuse'ит pattern из FT-038 (controller conversion + BasePdf override + graceful RateNotFound fallback + web UI selector)."
derived_from:
  - ../../domain/problem.md
  - ../../domain/money-and-currency.md
  - ../FT-005-dashboard-analytics/feature.md
  - ../FT-007-finances/feature.md
  - ../FT-017-pdf-export/feature.md
  - ../FT-037-multi-currency-conversion/feature.md
  - ../FT-038-owner-statement-currency/feature.md
  - ../../adr/ADR-004-integer-cents-for-money.md
  - ../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - per_user_currency_preference
---

# FT-039: Report Display Currency

## What

### Problem

Финансовые отчёты (`/reports` endpoint + `FinancialReportPdf`) и dashboard (`/dashboard` KPIs) пока всегда в org currency. UC-037 roadmap просит у иностранных пользователей (Thai УК у русского собственника, наоборот) видеть metrics в своей валюте. FT-037 даёт инфраструктуру, FT-038 внедрил конвертацию в owner statement — этот паттерн теперь применяется к reports/dashboard как **второй консюмер** FT-037 (`NS-02`).

Отличие от FT-038: у owner есть `preferred_currency` как persistent setting. У reports/dashboard нет per-user preference — выбор происходит ad-hoc per запрос через query param. Сохранение выбора в UI (localStorage) — возможно, но не требуется для MVP.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Reports + dashboard JSON/PDF доступны в любой из 11 CurrencyConfig валют через query param | 0% (always org currency) | 100% при доступном rate; graceful fallback при RateNotFound | Request-spec coverage для `/reports/financial?currency=USD`, `/dashboard?currency=USD`, `/reports/financial.pdf?currency=USD` |
| `MET-02` | Regression — запросы без `?currency` (или `?currency=<org.currency>`) | pre-FT-039 behaviour | 0 изменений в response shape (кроме additive polls) | Request-spec NEG-01 + existing dashboard/reports specs remain green |

### Scope

- `REQ-01` `Api::V1::ReportsController#financial` и `#financial_pdf` принимают optional `?currency=<ISO>` query param. Valid ISO codes from `CurrencyConfig.codes` (плюс пустой/отсутствующий — дефолт на org currency).
- `REQ-02` `Api::V1::DashboardController#show` принимает optional `?currency=<ISO>` query param с той же семантикой.
- `REQ-03` Controller конвертирует cents-поля:
  - **Reports** (`/reports/financial`): `total_revenue`, `total_expenses`, `net_income`, `adr`, `revpar`, `revenue_by_property[].revenue`, `expenses_by_category[].total`. `occupancy_rate` — percent, не конвертируется.
  - **Dashboard** (`/dashboard`): `revenue_this_month` — единственное cents-поле. `upcoming_check_ins/check_outs` содержат `{id, unit_name, guest_name, check_in, check_out, status}` без cents — не конвертируются. `occupancy_rate` — percent, не конвертируется.

  Конвертация через `CurrencyConverter.convert(amount_cents:, from: org.currency, to: target, at: effective_at, organization: Current.organization)`. `effective_at = [to, Date.current].min` для reports; `Date.current` для dashboard (snapshot-today, нет from/to).
- `REQ-04` Graceful fallback при `CurrencyConverter::RateNotFound` — возвращаем в org currency + `currency_fallback_reason: "rate_not_found"` в JSON. PDF рендерит fallback-notice (FT-038 FALLBACK_NOTICE pattern reuse, вынести в BasePdf как shared constant).
- `REQ-05` Invalid currency code (`?currency=XYZ`) → 422 ValidationError (не RateNotFound fallback): обработка на controller level `unless CurrencyConfig.codes.include?(target)`.
- `REQ-06` Statement-style JSON-поля: `currency`, `fx_rate_x1e10` (per DEC-01 FT-038 formula: `(converted * 10**10) / original` для non-zero total_revenue, иначе null), `currency_fallback_reason`.
- `REQ-07` `Pdf::FinancialReportPdf` зеркалит pattern `OwnerStatementPdf` FT-038: принимает `data[:currency]` + `data[:currency_fallback_reason]`, fallback-notice в начале документа, `fmt(cents, currency_override: @override)`.
- `REQ-08` Pull `FALLBACK_NOTICE` constant up в `Pdf::BasePdf` (shared across PDF descendants). Remains **Ruby-level RU-only literal** (consistent с FT-038 REQ-07 — backend i18n вне scope FT-039). OwnerStatementPdf обновляется использовать `BasePdf::FALLBACK_NOTICE` вместо local const — CHK-03 verifies regression.
- `REQ-09` Frontend: `ReportsView.vue` + `DashboardView.vue` добавляют `<v-select>` "Display currency" с опциями "Auto" (null = org) + 11 кодов из `CURRENCY_LIST`. Выбор хранится в component state (ref). При изменении триггерит refetch с `?currency=<code>`. `frontend/src/api/{reports,dashboard,pdfExport}.js` прокидывают currency в query params через generic `params` spread (stores не существуют — прямой api-call pattern, как сейчас).
- `REQ-10` i18n keys в `frontend/src/locales/{ru,en}.json`:
  - `reports.displayCurrency` (label для v-select)
  - `reports.displayCurrencyAuto` ("Авто" / "Auto — organization currency")
  - `reports.messages.currencyFallbackNotice` (warning banner в web UI при fallback)

  Dashboard переиспользует те же ключи через namespace `reports.*` (избегаем duplicates).

### Non-Scope

- `NS-01` Per-user persistent preference (user может сохранить дефолтную валюту своего аккаунта для reports) — future enhancement. Scope FT-039 — ad-hoc query param + session-local UI state (pinia/localStorage — не в scope).
- `NS-02` Graphs / sparklines / trend-charts — не переводятся; в scope только numeric KPIs которые cents.
- `NS-03` Booking widget / public reports — FT-010 уровня, не в FT-039.
- `NS-04` `occupancy_rate` (percent) в reports и dashboard — не cents, не конвертируется.
- `NS-04a` Dashboard не содержит `adr`/`revpar` (они только в reports) — конвертация ADR/RevPAR применяется только в reports path.
- `NS-05` Historical rate backfill — reuse FT-037 CurrencyConverter.lookup_direct fallback `effective_date <= at`.
- `NS-06` PDF byte-level regression — достаточно %PDF magic + feature.md CHK.
- `NS-07` Frontend unit-test для Display Currency select-dropdown в ReportsView/DashboardView — не добавляется (consistent с NS-06 FT-038). REQ-09 verify через request-spec end-to-end на backend endpoint + manual smoke в UI после deploy.

### Constraints / Assumptions

- `ASM-01` FT-037 + FT-038 merged в main; `CurrencyConverter.convert` доступен; `BasePdf#fmt(cents, currency_override:)` signature accepted (CHK-04 из FT-038).
- `ASM-02` FinancialReportPdf использует тот же private `fmt` из BasePdf — минимальный code path change (mirror FT-038 OwnerStatementPdf).
- `CON-01` ADR-004 invariant: все суммы integer cents, конвертация compute-only.
- `CON-02` Multi-tenant (PCON-01): `Current.organization` как scope; `CurrencyConverter.convert` получает `organization: Current.organization`.
- `CON-03` Query param `?currency=` validation происходит на controller level (`CurrencyConfig.codes.include?`) — invalid → 422 (отличие от RateNotFound fallback!). Это DEC-01.
- `CON-04` FinancialReportPdf и DashboardController — **both** используют `effective_at = [to, Date.current].min` для reports и `Date.current` для dashboard (так как dashboard — snapshot-today).
- `DEC-01` Invalid currency → 422 (не fallback) — явный user error, заслуживает explicit reject. Отличается от RateNotFound (server-side состояние); RateNotFound → graceful fallback (FT-038 pattern).
- `DEC-02` Нет per-user persistence — UI может использовать localStorage для session-wide default, но backend всегда читает `?currency=` из request. Future FT-041+ может добавить user field `default_report_currency`.

## How

### Solution

Controller-level pattern из FT-038 обобщён на reports + dashboard. Конвертация тех же агрегатов через `CurrencyConverter.convert`, с rescue RateNotFound → fallback. PDF (FinancialReportPdf) зеркалит OwnerStatementPdf — принимает `data[:currency]` + `data[:currency_fallback_reason]`. `FALLBACK_NOTICE` constant поднимается в BasePdf для reuse. Frontend получает select-dropdown в обоих views — смена триггерит refetch.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `backend/app/controllers/api/v1/reports_controller.rb` | code | Conversion branch в financial + financial_pdf + 422 validation + new JSON fields |
| `backend/app/controllers/api/v1/dashboard_controller.rb` | code | Same pattern: ?currency + conversion + fallback |
| `backend/app/services/pdf/base_pdf.rb` | code | Pull-up `FALLBACK_NOTICE` const (refactor FT-038 code) |
| `backend/app/services/pdf/owner_statement_pdf.rb` | code | Use BasePdf::FALLBACK_NOTICE (remove local const) |
| `backend/app/services/pdf/financial_report_pdf.rb` | code | Currency override + fallback notice + @display_currency |
| `frontend/src/views/ReportsView.vue` | code | v-select + watch → refetch (JSON + PDF download) |
| `frontend/src/views/DashboardView.vue` | code | v-select + watch → refetch |
| `frontend/src/api/reports.js` | code | Accept `currency` через params spread |
| `frontend/src/api/dashboard.js` | code | Accept params object; pass through to query string |
| `frontend/src/api/pdfExport.js` | code | `downloadFinancialReport({ currency, from, to })` прокидывает currency в query |
| `frontend/src/locales/{ru,en}.json` | data | reports.* new keys |
| `backend/spec/requests/api/v1/reports_spec.rb` | code | SC-01 + NEG-01..04 |
| `backend/spec/requests/api/v1/dashboard_spec.rb` | code | SC-02 + NEG-01..04 |
| `backend/spec/services/pdf/financial_report_pdf_spec.rb` | code | Currency override + fallback row |
| `backend/spec/services/pdf/owner_statement_pdf_spec.rb` | code | Sanity after FALLBACK_NOTICE pullup |

### Flow

1. Admin открывает `/reports` (или `/dashboard`), выбирает "Display currency = USD" в selector → Vue emits change → store fetch с `params: { currency: "USD", ... }`.
2. GET `/api/v1/reports/financial?currency=USD&from=...&to=...` (JSON) или `/api/v1/reports/financial.pdf?currency=USD`.
3. Controller validate `target = params[:currency]`: если present и не в `CurrencyConfig.codes` — 422 (DEC-01). Если nil или `== org.currency` — skip conversion, pre-FT-039 behaviour.
4. Controller собирает cents-агрегаты (revenue, expenses, net_income, adr, revpar, breakdown arrays) в org currency (pre-FT-039 path).
5. Если target set и != org.currency — `effective_at = [to, Date.current].min` для reports (snapshot-today для dashboard) и `begin...rescue CurrencyConverter::RateNotFound`:
   a. Конвертим каждое cents-поле (total + per-property + per-category).
   b. `fx_rate_x1e10 = (converted_total_revenue * 10**10) / original_total_revenue` если `original > 0` иначе nil.
   c. JSON дополняется `currency, fx_rate_x1e10, currency_fallback_reason: nil`.
6. `rescue RateNotFound` → keep original cents, `currency = org.currency, fx_rate_x1e10 = nil, currency_fallback_reason = "rate_not_found"`.
7. Для PDF path — `Pdf::FinancialReportPdf.new(org, data).render_pdf`, данные включают `currency + currency_fallback_reason`, PDF использует `@override = data[:currency]` если != org и рендерит red notice при fallback.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | GET `/api/v1/reports/financial[.pdf]?currency=<ISO>&from=...&to=...` | Producer: this feature; Consumer: frontend | Same JSON shape + 3 new fields (`currency`, `fx_rate_x1e10`, `currency_fallback_reason`) per CTR-01 FT-038. Invalid currency → 422 {error: [message]}. |
| `CTR-02` | GET `/api/v1/dashboard?currency=<ISO>` | Producer: this feature; Consumer: frontend | Same JSON shape + 3 new fields. `effective_at = Date.current` (dashboard is snapshot-today, no from/to). |
| `CTR-03` | `Pdf::FinancialReportPdf` принимает `data[:currency]` и `data[:currency_fallback_reason]` | Producer: this feature; Consumer: controller | Same signature as OwnerStatementPdf FT-038. `BasePdf::FALLBACK_NOTICE` shared const. |

### Failure Modes

- `FM-01` `CurrencyApiClient::RateNotFound` при convert → rescue, fallback, `currency_fallback_reason: "rate_not_found"`, original cents preserved. 200 OK. Покрыто `NEG-02`.
- `FM-02` `?currency=XYZ` → 422 с i18n error (not `RateNotFound`). Покрыто `NEG-03`.
- `FM-03` `?currency=<org.currency>` или missing → skip conversion, identical to pre-FT-039 response (MET-02). `fx_rate_x1e10: nil`, `currency_fallback_reason: nil`. Покрыто `NEG-01`.
- `FM-04` Zero-revenue (reports with empty period) — `fx_rate_x1e10: nil` per DEC-01 FT-038 formula. Reports rendering не ломается.
- `FM-05` `dashboard` endpoint — нет `from`/`to` params; effective_at = Date.current всегда.

### ADR Dependencies

| ADR | Current `decision_status` | Used for | Execution rule |
| --- | --- | --- | --- |
| [../../adr/ADR-004-integer-cents-for-money.md](../../adr/ADR-004-integer-cents-for-money.md) | `accepted` | Integer cents invariant — конвертированные cents тоже integer в target minor units | Canonical |
| [../../adr/ADR-012-class-level-authorize-nested-controllers.md](../../adr/ADR-012-class-level-authorize-nested-controllers.md) | `accepted` | Existing `:report, :financial?` + `:dashboard, :show?` authorize — без изменений, scope FT-039 не меняет permissions | Canonical |
| [../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md](../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md) | `accepted` | Transitive — FT-037 CurrencyConverter reads только валидные rates per DB invariant; FT-039 не модифицирует ExchangeRate | Canonical (transitive dependency) |

## Verify

### Exit Criteria

- `EC-01` Reports JSON + PDF корректно конвертируют cents-агрегаты когда `?currency=<ISO!=org>` задан и rate доступен. Все `*_cents` и `breakdown` поля переведены в target minor units.
- `EC-02` Dashboard JSON корректно конвертирует cents-поля при `?currency=<ISO!=org>`.
- `EC-03` Fallback при RateNotFound — 200 OK в org currency + `currency_fallback_reason: "rate_not_found"` + fallback notice в PDF.
- `EC-04` Invalid currency code → 422 (не fallback), `errors` содержит message.
- `EC-05` Missing `?currency` или `?currency=<org.currency>` → identical pre-FT-039 behaviour (MET-02 regression). Новые JSON поля присутствуют но незначительные (`currency = org.currency`, others nil).
- `EC-06` Existing OwnerStatementPdf продолжает работать после FALLBACK_NOTICE pullup в BasePdf (refactor regression).

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CON-01`, `CON-02`, `CTR-01` | `EC-01`, `EC-05`, `SC-01`, `NEG-01` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CON-01`, `CON-02`, `CTR-02` | `EC-02`, `EC-05`, `SC-02`, `NEG-01` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CON-01`, `FM-01`, `FM-04` | `EC-01`, `EC-02`, `SC-01`, `SC-02` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-04` | `FM-01`, `CTR-03` | `EC-03`, `NEG-02` | `CHK-01`, `CHK-02`, `CHK-03` | `EVID-01..03` |
| `REQ-05` | `DEC-01`, `FM-02` | `EC-04`, `NEG-03` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-06` | `CTR-01`, `CTR-02` | `EC-01`, `EC-02`, `EC-05` | `CHK-01`, `CHK-02` | `EVID-01`, `EVID-02` |
| `REQ-07` | `CTR-03`, `ASM-01` | `EC-03` | `CHK-03` | `EVID-03` |
| `REQ-08` | — | `EC-06` (regression) | `CHK-03`, `CHK-04` | `EVID-03`, `EVID-04` |
| `REQ-09` | `CTR-01`, `CTR-02`, `NS-07` | `EC-01`, `EC-02` | `CHK-01`, `CHK-02` (backend contract + manual smoke per NS-07) | `EVID-01`, `EVID-02` |
| `REQ-10` | `CTR-03`, `FM-01` | `EC-03`, `EC-04` | `CHK-01`, `CHK-02` (422 error messages проходят через inclusion), `CHK-03` (PDF FALLBACK_NOTICE) | `EVID-01..03` |

### Acceptance Scenarios

- `SC-01` **Reports — RUB org, `?currency=USD`, stored rate.** Given `organization.currency = 'RUB'`, stored `ExchangeRate(USD→RUB, rate_x1e10=1_000_000_000_000, today)`. 1 reservation `total_price_cents=1_000_000` (=10 000 RUB). When GET `/api/v1/reports/financial?currency=USD&from=<today-7>&to=<today>`. Then `total_revenue = 10_000` (USD cents = $100.00), `currency = "USD"`, `fx_rate_x1e10 = 100_000_000`, `currency_fallback_reason = nil`.
- `SC-02` **Dashboard — RUB org, `?currency=USD`, today snapshot.** Given same rate. When GET `/api/v1/dashboard?currency=USD`. Then все cents-поля (revenue_this_month, etc.) конвертированы в USD cents, `currency = "USD"`.

### Negative / edge scenarios

- `NEG-01` **Missing/same-currency param.** When GET `/api/v1/reports/financial` (no currency). Then `currency = org.currency`, `fx_rate_x1e10 = nil`, `currency_fallback_reason = nil`. Pre-FT-039 JSON shape preserved (плюс 3 additive поля).
- `NEG-02` **RateNotFound fallback.** Given no rate. When GET `/api/v1/reports/financial?currency=USD`. Then 200 OK, `currency = org.currency, fx_rate_x1e10 = nil, currency_fallback_reason = "rate_not_found"`, cents in original org values.
- `NEG-03` **Invalid currency code.** When GET `/api/v1/reports/financial?currency=XYZ`. Then 422, `errors` contains inclusion message.
- `NEG-04` **No permission.** Existing `ReportPolicy` / `DashboardPolicy` unchanged — membership без `finances.view` → 403 на any GET. FT-039 не изменяет permission gates (reuse).
- `NEG-05` **Multi-tenant (PCON-01).** Given org A user + seed reservation в org B. When GET `/api/v1/reports/financial?currency=USD` с headers org A. Then response показывает только revenue org A; org B данные не leak (Current.organization scope unchanged от pre-FT-039). Reuse existing isolation (FT-005/007 request specs уже это проверяют; FT-039 CHK-04 full regression).

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `REQ-01`, `REQ-03..06`, `REQ-09`, `EC-01`, `EC-03..05`, `SC-01`, `NEG-01..04` (reports) | `cd backend && bundle exec rspec spec/requests/api/v1/reports_spec.rb` | Все зелёные | `artifacts/ft-039/verify/chk-01/` |
| `CHK-02` | `REQ-02..06`, `REQ-09`, `EC-02..05`, `SC-02`, `NEG-01..04` (dashboard) | `cd backend && bundle exec rspec spec/requests/api/v1/dashboard_spec.rb` | Все зелёные | `artifacts/ft-039/verify/chk-02/` |
| `CHK-03` | `REQ-07..08`, `EC-03`, `EC-06` | `cd backend && bundle exec rspec spec/services/pdf/financial_report_pdf_spec.rb spec/services/pdf/owner_statement_pdf_spec.rb` | Все зелёные; FALLBACK_NOTICE shared; currency override path тестируется | `artifacts/ft-039/verify/chk-03/` |
| `CHK-04` | `EC-06` (full regression) | `cd backend && bundle exec rspec` | Full backend suite зелёный (no regressions) | `artifacts/ft-039/verify/chk-04/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-039/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-039/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-039/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-039/verify/chk-04/` |

### Evidence

- `EVID-01` rspec output reports_spec.
- `EVID-02` rspec output dashboard_spec.
- `EVID-03` rspec output PDF specs (financial + owner_statement).
- `EVID-04` rspec output full backend suite.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | rspec output (reports) | verify-runner | `artifacts/ft-039/verify/chk-01/` | `CHK-01` |
| `EVID-02` | rspec output (dashboard) | verify-runner | `artifacts/ft-039/verify/chk-02/` | `CHK-02` |
| `EVID-03` | rspec output (PDF) | verify-runner | `artifacts/ft-039/verify/chk-03/` | `CHK-03` |
| `EVID-04` | rspec output (full backend) | verify-runner | `artifacts/ft-039/verify/chk-04/` | `CHK-04` |
