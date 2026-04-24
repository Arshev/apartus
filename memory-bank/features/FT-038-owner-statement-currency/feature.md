---
title: "FT-038: Owner Statement in Owner's Currency"
doc_kind: feature
doc_function: canonical
purpose: "Первый консюмер FT-037: owner statement (JSON + PDF) показывает суммы в валюте собственника (Owner.preferred_currency), конвертируя cents через CurrencyConverter по курсу на конец периода. Graceful fallback на org currency при RateNotFound."
derived_from:
  - ../../domain/problem.md
  - ../../domain/money-and-currency.md
  - ../FT-012-owner-module/feature.md
  - ../FT-017-pdf-export/feature.md
  - ../FT-037-multi-currency-conversion/feature.md
  - ../../adr/ADR-004-integer-cents-for-money.md
  - ../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - cross_feature_consumer_behavior
---

# FT-038: Owner Statement in Owner's Currency

## What

### Problem

Owner module (FT-012) уже генерирует statement (JSON + PDF) per-period с revenue, commission, expenses, net_payout. Все суммы — в валюте организации (`Current.organization.currency`), потому что `Pdf::BasePdf#fmt` использует только её.

У собственника часто другая расчётная валюта: русская УК (org currency=RUB) ведёт объект иностранного владельца, который хочет видеть выплаты в USD или EUR. FT-037 поставил инфраструктуру (`ExchangeRate` + `CurrencyConverter`), но owner module её не использует — это первый из консюмеров, объявленных в FT-037 NS-02.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Owner statements (JSON + PDF), рендерящиеся в owner's currency когда задан `preferred_currency` | 0% (всегда org currency) | 100% при доступном rate; explicit fallback при RateNotFound | Request-spec для `GET /api/v1/owners/:id/statement` (happy path + NEG-01 fallback) |
| `MET-02` | Regression — existing owners без `preferred_currency` | pre-FT-038 behaviour | 0 изменений (identical JSON + PDF output) | Request-spec NEG-03 + regression-spec `FinancialReportPdf` |

### Scope

- `REQ-01` Поле `Owner.preferred_currency` (string, nullable, `validates inclusion: { in: CurrencyConfig.codes, allow_nil: true }`). `NULL` = использовать `organization.currency` (дефолт — обратно-совместимо).
- `REQ-02` Owner create/edit dialog в `frontend/src/views/OwnerListView.vue` (форма inline, не отдельный FormView) получает select-поле "Preferred statement currency" из `CurrencyConfig.codes`, плюс явная опция "Auto (org currency)" ↔ `null`. `frontend/src/api/owners.js` + `frontend/src/stores/owners.js` прозрачно прокидывают новое поле в PATCH/POST payload через существующий spread (никаких дополнительных actions не нужно).
- `REQ-03` `Api::V1::OwnersController#statement`: если `owner.preferred_currency.present? && != organization.currency`, все cents-агрегаты (total_revenue, total_expenses, commission, net_payout + per-property analogues) конвертятся через `CurrencyConverter.convert(amount_cents: x, from: org.currency, to: owner.preferred_currency, at: effective_at, organization: Current.organization)`. `effective_at = [to, Date.current].min` (CON-02).
- `REQ-04` Statement JSON включает дополнительные поля: `currency` (ISO code display-валюты), `fx_rate_x1e10` (integer, DEC-01), `currency_fallback_reason` (string или null). См. `CTR-01`.
- `REQ-05` `Pdf::BasePdf#fmt(cents, currency_override: nil)` — optional keyword argument. Когда передан — использует `CurrencyConfig.config_for(currency_override)` вместо org-дефолта. `OwnerStatementPdf` передаёт display-валюту. Другие консюмеры (FinancialReportPdf) вызывают `fmt(cents)` без override — default `nil` сохраняет pre-FT-038 behaviour. См. `CTR-03`.
- `REQ-06` Graceful fallback: `CurrencyConverter::RateNotFound` rescue'ится в controller. `statement` возвращает агрегаты в org currency, JSON включает `currency_fallback_reason: "rate_not_found"`, PDF рендерит дополнительную строку (i18n key `ownerStatement.currencyFallbackNotice`: "Конвертация недоступна — показано в валюте организации" / "Conversion unavailable — shown in organization currency"). Статус 200, не 500.
- `REQ-07` i18n ключи в `frontend/src/locales/{ru,en}.json` (namespace соответствует существующему `owners.*` convention, не отдельный `ownerStatement.*`):
  - `owners.form.preferredCurrency` (label в dialog select)
  - `owners.form.preferredCurrencyAuto` ("Авто — валюта организации" / "Auto — organization currency")
  - `owners.statement.messages.currencyFallbackNotice` (баннер в UI при fallback — web). PDF fallback использует Ruby-level literal `Pdf::OwnerStatementPdf::FALLBACK_NOTICE` (русский only, consistent с другими PDF literals — backend локализация вне scope FT-038).

### Non-Scope

- `NS-01` Per-transaction rate pinning (зафиксировать курс в момент создания reservation/expense). Scope — только display-time conversion на дату конца периода.
- `NS-02` Multi-currency хранение в Reservation/Expense. FT-015 invariant остаётся: все суммы стора в `organization.currency`.
- `NS-03` Конвертация dashboard / reports / widgets — отдельные фичи (FT-039+).
- `NS-04` Historical rate backfill для периодов до `FetchExchangeRatesJob.first_run_date` — используется FT-037 lookup_direct fallback (`effective_date <= at`).
- `NS-05` Semantic расширение `preferred_currency` на payout ledger, commission pinning, owner portal dashboards — вне scope FT-038. Future features переиспользуют поле без переопределения (та же semantic «display currency для owner-facing output»).
- `NS-06` Frontend unit-test для select-dropdown — не добавляется. REQ-02 verify через request-spec CHK-02 end-to-end + manual smoke.
- `NS-07` PDF byte-level regression test (content diff) — не добавляется. Достаточно magic header check (`%PDF`) + spec над `@data` hash.

### Constraints / Assumptions

- `ASM-01` `FetchExchangeRatesJob` запускается ежедневно и заполняет API rates. В dev окружении — либо через `db/seeds/exchange_rates.rb` (FT-037 REQ-09), либо через manual override. При пустой `exchange_rates` — срабатывает RateNotFound fallback (REQ-06).
- `ASM-02` `Pdf::BasePdf#fmt` — private method в base class, reuse'ится всеми PDF descendants (подтверждено grounding'ом: `FinancialReportPdf`, `OwnerStatementPdf`). Изменение сигнатуры на `fmt(cents, currency_override: nil)` обратно-совместимо для всех текущих callers, которые используют `fmt(cents)` без override.
- `CON-01` Stored amounts не мутируются (ADR-004, FT-037 CON-01). Конвертация compute-only в controller + PDF renderer.
- `CON-02` Если `effective_at > Date.current` (owner запросил будущий период) → clamped до `Date.current`. Rates с `effective_date > today` в exchange_rates не хранятся (FT-037 FM-09).
- `CON-03` Multi-tenant (PCON-01): единственная точка входа к Owner в statement flow — `Current.organization.owners.find_by(id: params[:id])`. Чужой owner → 404. Дополнительно: `CurrencyConverter.convert` всегда вызывается с `organization: Current.organization` — inherited ExchangeRate scoping (FT-037 CON-03).
- `CON-04` Backwards compatibility: existing owners без `preferred_currency` (nullable default) → identical pre-FT-038 JSON и PDF output (MET-02).
- `CON-05` Миграция reversible: `add_column :owners, :preferred_currency, :string` / rollback = drop_column. Data migration не требуется (nullable default).
- `DEC-01` `fx_rate_x1e10` в JSON = **effective forward rate** `from → to` в форме rate_x1e10: `(converted_cents * 10**10) / original_cents` для non-zero `total_revenue_cents`; `null` если `total_revenue_cents == 0` или конвертации не было. Direction-consistent с `from: org.currency, to: owner.preferred_currency`. Consumer (frontend / external API) получает single composite rate без provenance (direct / inverse / triangulated) — детали реализации инкапсулированы в `CurrencyConverter`.
- `DEC-02` Поле названо `preferred_currency` (не `statement_currency`) — generic naming зарезервирован под future owner-facing reports. Текущая feature — единственный consumer; расширение scope идёт через отдельные фичи с той же семантикой (NS-05).

## How

### Solution

Добавить `Owner.preferred_currency` как nullable string с inclusion validation. Controller `statement` после сбора агрегатов — если `preferred_currency` задана и отличается от org — применяет `CurrencyConverter.convert` ко всем суммам (в rescue-блоке для RateNotFound). `Pdf::BasePdf#fmt` обобщается до per-call currency override (default `nil` сохраняет pre-FT-038 behaviour). Rate snapshot — `at = [to, Date.current].min`. Fallback при RateNotFound — downgrade в org currency с explicit флагом в JSON + i18n строкой в PDF.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `backend/db/migrate/NNN_add_preferred_currency_to_owners.rb` | code | Новая колонка (nullable, string, без индекса) |
| `backend/db/schema.rb` | code | Auto-updated после migrate |
| `backend/app/models/owner.rb` | code | Inclusion validation для `preferred_currency` |
| `backend/app/controllers/api/v1/owners_controller.rb` | code | Конвертация в `statement`, новые JSON-поля, strong params `permit(:preferred_currency)` |
| `backend/app/services/pdf/base_pdf.rb` | code | `fmt(cents, currency_override: nil)` signature + per-call config lookup |
| `backend/app/services/pdf/owner_statement_pdf.rb` | code | Передача display-currency в `fmt`, fallback-row при RateNotFound |
| `frontend/src/views/OwnerListView.vue` | code | Add preferred_currency select в existing inline create/edit dialog |
| `frontend/src/locales/ru.json` | data | 3 i18n ключа (REQ-07) |
| `frontend/src/locales/en.json` | data | Same keys, English values |
| `backend/spec/models/owner_spec.rb` | code | Inclusion validation coverage |
| `backend/spec/requests/api/v1/owners_spec.rb` | code | SC-01 + NEG-01..05 для statement |
| `backend/spec/services/pdf/owner_statement_pdf_spec.rb` | code | Currency override + fallback row + magic header |
| `backend/spec/services/pdf/financial_report_pdf_spec.rb` | code | Regression — `fmt(cents)` без override сохраняет pre-FT-038 output |

### Flow

1. Admin открывает Owner create/edit dialog в `OwnerListView.vue`, выбирает "Preferred currency = USD" (или "Auto" = null) → PATCH `/api/v1/owners/:id` с `preferred_currency: "USD"`.
2. Backend model validation допускает значения из `CurrencyConfig.codes` или nil; иначе 422.
3. Позже GET `/api/v1/owners/:id/statement?from=...&to=...` (JSON или PDF).
4. Controller собирает cents-агрегаты (revenue/expenses/commission/net_payout per property + total) в org currency (pre-FT-038 path без изменений).
5. Условная конвертация:
   - Если `owner.preferred_currency.blank? || owner.preferred_currency == organization.currency` → skip. JSON `currency = org.currency`, `fx_rate_x1e10: null`, `currency_fallback_reason: null`.
   - Иначе:
     - `effective_at = [to, Date.current].min` (CON-02).
     - `begin` — для каждого cents-поля: `converted = CurrencyConverter.convert(amount_cents: x, from: org.currency, to: owner.preferred_currency, at: effective_at, organization: Current.organization)`; заменяем в `data` hash.
     - `fx_rate_x1e10` считается на non-zero `total_revenue_cents` per DEC-01.
     - `rescue CurrencyConverter::RateNotFound` → keep original cents, `currency = org.currency`, `currency_fallback_reason = "rate_not_found"`, `fx_rate_x1e10: null`.
6. JSON response включает все existing cents поля + `currency`, `fx_rate_x1e10`, `currency_fallback_reason`.
7. Если `format=pdf`: `OwnerStatementPdf.new(org, data).render_pdf` — PDF рендерится в display currency. При fallback — дополнительная i18n строка в начале документа.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | GET `/api/v1/owners/:id/statement` JSON response | Producer: this feature; Consumer: frontend, external API clients | Новые поля: `currency: string`, `fx_rate_x1e10: integer \| null` (DEC-01 semantic), `currency_fallback_reason: string \| null` ("rate_not_found" при fallback). Existing cents-поля остаются integer **в display currency's minor units** (не major). Consumer formatting через `formatMoney(cents, currency)`. Breaking change требует major bump. |
| `CTR-02` | PATCH/POST `/api/v1/owners[/:id]` body | Producer: UI; Consumer: controller | Extends с `preferred_currency: string \| null`. Strong params: `permit(:name, :email, :phone, :commission_rate, :notes, :preferred_currency)`. Invalid ISO code → 422 с inclusion violation. |
| `CTR-03` | `Pdf::BasePdf#fmt(cents, currency_override: nil) -> String` | Producer: this feature; Consumer: all PDF descendants | Default `nil` keyword сохраняет pre-FT-038 behaviour (use `@currency` = org). Explicit ISO code — use that currency's `CurrencyConfig`. Guarantee: `fmt(5000)` в `FinancialReportPdf` продолжает возвращать то же значение после FT-038 (MET-02 regression, CHK-04). |

### Failure Modes

- `FM-01` `CurrencyConverter.convert` raises `RateNotFound` (нет direct, inverse, triangulated rate на дату) → controller rescue, fallback на org currency, JSON `currency_fallback_reason: "rate_not_found"`, PDF дополнительная строка. Статус 200. Покрыто `NEG-01`.
- `FM-02` `effective_at > Date.current` (future period) → clamped до `Date.current` (CON-02). Покрыто `NEG-02`.
- `FM-03` PATCH `/api/v1/owners/:id` с `preferred_currency: "XYZ"` (не в `CurrencyConfig.codes`) → model validation → 422. `owner.preferred_currency` в БД не изменён. Покрыто `NEG-03`.
- `FM-04` Owner foreign org (PCON-01) — `Current.organization.owners.find_by(id: X)` → nil → controller 404. Покрыто `NEG-04`.
- `FM-05` Membership без permission `finances.view` → Pundit 403 на GET statement (existing `OwnerPolicy`). Покрыто `NEG-05`.
- `FM-06` Zero-revenue statement (`total_revenue_cents == 0`) — `fx_rate_x1e10` в JSON = `null` (деление на 0 избегнуто per DEC-01). PDF рендерится с нулями.

### ADR Dependencies

| ADR | Current `decision_status` | Used for | Execution rule |
| --- | --- | --- | --- |
| [../../adr/ADR-004-integer-cents-for-money.md](../../adr/ADR-004-integer-cents-for-money.md) | `accepted` | Integer cents invariant — конвертированные значения тоже integer minor units | Canonical — no float arithmetic |
| [../../adr/ADR-012-class-level-authorize-nested-controllers.md](../../adr/ADR-012-class-level-authorize-nested-controllers.md) | `accepted` | OwnerPolicy reused; `finances.view` permission gate | Canonical |
| [../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md](../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md) | `accepted` | ExchangeRate invariants + CurrencyConverter reused from FT-037 | Canonical |

## Verify

### Exit Criteria

- `EC-01` Owner statement JSON и PDF корректно конвертируют агрегаты в `owner.preferred_currency` когда задана и отличается от org, используя rate на `[to, Date.current].min`. Все cents-поля остаются integer в target currency's minor units.
- `EC-02` Fallback при `CurrencyConverter::RateNotFound` — statement 200 OK в org currency + `currency_fallback_reason: "rate_not_found"` (JSON) + i18n строка (PDF). Без 500.
- `EC-03` `owner.preferred_currency = nil` (дефолт для existing owners) → pre-FT-038 behaviour: JSON `currency = org.currency`, `fx_rate_x1e10 = null`, `currency_fallback_reason = null`, PDF идентичен pre-FT-038 (regression MET-02).
- `EC-04` Multi-tenant (PCON-01): GET statement / PATCH owner чужой org → 404. `preferred_currency` leak между orgs невозможен.
- `EC-05` Permission enforcement — без `finances.view` GET statement → 403.
- `EC-06` FinancialReportPdf и другие PDF consumers не меняют поведение при добавлении `currency_override` keyword (backwards compat, CHK-04).

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CON-01`, `CON-04`, `CON-05` | `EC-01`, `EC-03`, `NEG-03` | `CHK-01` | `EVID-01` |
| `REQ-02` | `CTR-02` | `EC-01`, `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CON-01`, `CON-02`, `CON-03`, `DEC-01`, `FM-01`, `FM-02`, `FM-06` | `EC-01`, `EC-02`, `SC-01`, `NEG-01`, `NEG-02` | `CHK-02` | `EVID-02` |
| `REQ-04` | `CTR-01`, `DEC-01`, `FM-06` | `EC-01`, `EC-02`, `SC-01` | `CHK-02` | `EVID-02` |
| `REQ-05` | `CTR-03`, `ASM-02` | `EC-06` | `CHK-03`, `CHK-04` | `EVID-03`, `EVID-04` |
| `REQ-06` | `FM-01`, `CTR-01` | `EC-02`, `NEG-01` | `CHK-02`, `CHK-03` | `EVID-02`, `EVID-03` |
| `REQ-07` | `CTR-01` | `EC-02` | `CHK-03` | `EVID-03` |

### Acceptance Scenarios

- `SC-01` **Happy path — RUB org, USD owner, today.** Given `organization.currency = 'RUB'`, `owner.preferred_currency = 'USD'`. Stored `ExchangeRate(base='USD', quote='RUB', rate_x1e10=1_000_000_000_000, effective_date=today, source='api')` — semantically 100 RUB per 1 USD. Revenue: 1 reservation с `total_price_cents = 1_000_000` (= 10 000.00 RUB). When GET `/api/v1/owners/:id/statement?from=<today-7>&to=<today>&format=json`. Then:
  - `CurrencyConverter.convert(amount_cents: 1_000_000, from: 'RUB', to: 'USD', at: today, organization: org)` делает inverse lookup (direct RUB→USD отсутствует, reverse USD→RUB stored). Inverse rate = `10**20 / 1_000_000_000_000 = 100_000_000` (per FT-037 CurrencyConverter formula). Apply: decimals diff = 0, `num = 1_000_000 * 100_000_000 * 1 = 10**14`; `den = 10**10 * 1`; `result = 10_000` (integer minor USD = 100.00 USD).
  - `total_revenue_cents: 10_000`.
  - `currency: "USD"`.
  - `fx_rate_x1e10 = (10_000 * 10**10) / 1_000_000 = 100_000_000` per DEC-01 (effective forward RUB→USD rate).
  - `currency_fallback_reason: null`.

### Negative / edge scenarios

- `NEG-01` **RateNotFound fallback.** Given `owner.preferred_currency = 'USD'`, `org.currency = 'RUB'`, `exchange_rates` таблица пустая для USD↔RUB. When GET statement. Then 200; JSON `currency: "RUB"`, `fx_rate_x1e10: null`, `currency_fallback_reason: "rate_not_found"`, все `*_cents` остаются в original org values. PDF рендерится с fallback i18n строкой в начале документа.
- `NEG-02` **Future period clamp.** Given `owner.preferred_currency = 'USD'`, stored rate для today (не для future). When `to = today + 60`. Then `effective_at = today`, конвертация использует today-rate (FM-02 / CON-02), не raises RateNotFound.
- `NEG-03` **Invalid currency code.** When PATCH `/api/v1/owners/:id` body `{preferred_currency: "XYZ"}`. Then 422, `errors` содержит inclusion violation. `owner.preferred_currency` в БД не изменён.
- `NEG-04` **Foreign org owner (PCON-01).** Given `owner` в org B. When user org A делает GET `/api/v1/owners/:id/statement`. Then 404 (Current.organization scope).
- `NEG-05` **No permission.** Given membership без `finances.view`. When GET `/api/v1/owners/:id/statement`. Then 403.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `REQ-01`, `EC-03` (model-level), `NEG-03` | `cd backend && bundle exec rspec spec/models/owner_spec.rb` | Все зелёные; inclusion validation покрыта | `artifacts/ft-038/verify/chk-01/` |
| `CHK-02` | `REQ-02..04`, `EC-01`, `EC-02`, `EC-04`, `EC-05`, `SC-01`, `NEG-01..05` | `cd backend && bundle exec rspec spec/requests/api/v1/owners_spec.rb` | Все зелёные; SC-01 math доказан; fallback + multi-tenant + permission enforced | `artifacts/ft-038/verify/chk-02/` |
| `CHK-03` | `REQ-05..07`, `EC-02`, `FM-06` | `cd backend && bundle exec rspec spec/services/pdf/owner_statement_pdf_spec.rb` | Все зелёные; `fmt` с currency_override покрыт; fallback-строка рендерится; %PDF magic header присутствует в rendered PDF | `artifacts/ft-038/verify/chk-03/` |
| `CHK-04` | `EC-06` (regression) | `cd backend && bundle exec rspec spec/services/pdf/financial_report_pdf_spec.rb` | Все зелёные; ни один existing example не упал после изменения BasePdf#fmt signature | `artifacts/ft-038/verify/chk-04/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-038/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-038/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-038/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-038/verify/chk-04/` |

### Evidence

- `EVID-01` rspec output `owner_spec.rb` — inclusion validation для preferred_currency.
- `EVID-02` rspec output `requests/api/v1/owners_spec.rb` — SC-01 + NEG-01..05.
- `EVID-03` rspec output `services/pdf/owner_statement_pdf_spec.rb` — currency override, fallback-row, %PDF magic header.
- `EVID-04` rspec output `services/pdf/financial_report_pdf_spec.rb` — regression baseline после `fmt` signature change.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | rspec output (model) | verify-runner | `artifacts/ft-038/verify/chk-01/` | `CHK-01` |
| `EVID-02` | rspec output (request) | verify-runner | `artifacts/ft-038/verify/chk-02/` | `CHK-02` |
| `EVID-03` | rspec output (OwnerStatementPdf) | verify-runner | `artifacts/ft-038/verify/chk-03/` | `CHK-03` |
| `EVID-04` | rspec output (FinancialReportPdf regression) | verify-runner | `artifacts/ft-038/verify/chk-04/` | `CHK-04` |
