---
title: "FT-038: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-038. Discovery context, 8 шагов, test strategy, risks."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_038_scope
  - ft_038_architecture
  - ft_038_acceptance_criteria
  - ft_038_blocker_state
---

# План имплементации

## Цель текущего плана

Поставить первого консюмера FT-037: owner statement (JSON + PDF) рендерится в `Owner.preferred_currency` когда она задана. Все 4 CHK из feature.md зелёные, artefacts в `artifacts/ft-038/verify/chk-0{1..4}/`. Нулевые регрессии в FinancialReportPdf и других PDF consumers.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `backend/app/models/owner.rb` | Существующая модель (name, email, phone, commission_rate, notes, FK organization, has_many properties). | Добавляется `preferred_currency` nullable + inclusion validation. | Mirror pattern: `validates :currency, inclusion: { in: CurrencyConfig.codes }` из Organization. |
| `backend/app/controllers/api/v1/owners_controller.rb` | `statement` action (строки 45-95) собирает агрегаты в org currency. | Добавляется condition-branch для конвертации + strong params permit. | Не ломать существующие JSON поля; новые — additive только. |
| `backend/app/services/pdf/base_pdf.rb` | `fmt(cents)` private method, использует `@currency` = org. `FinancialReportPdf` and `OwnerStatementPdf` reuse. | Обобщение до `fmt(cents, currency_override: nil)` обратно-совместимо. | Mirror approach — additive keyword; default `nil` = pre-FT-038 |
| `backend/app/services/pdf/owner_statement_pdf.rb` | Consumer `fmt`; header + summary table + per-property table. | Передача display-currency; добавление fallback-строки при `currency_fallback_reason`. | Add optional param в `initialize`; text() i18n-ready; не ломать layout |
| `backend/app/services/pdf/financial_report_pdf.rb` + spec | Второй consumer `fmt(cents)`. | Regression baseline для CHK-04. | Spec не меняется — проверяет, что output байт-идентичен |
| `backend/app/services/currency_converter.rb` | FT-037 service: convert(amount_cents:, from:, to:, at:, organization:). | Используется в controller. Raises `CurrencyConverter::RateNotFound`. | Canonical API — не трогать |
| `frontend/src/views/OwnerListView.vue` | Inline create/edit dialog для owners. Form state в `form` ref, dialog через `v-dialog`. | Add select-поле `preferred_currency`. | Mirror паттерн dropdown из других Owner dialog fields |
| `frontend/src/api/owners.js` + `frontend/src/stores/owners.js` | CRUD client через axios + Pinia store. Spread `...form.value` передаёт всё. | Прозрачно — никаких изменений не нужно, но REQ-02 упоминает. | Не трогать |
| `frontend/src/utils/currency.js` | `CURRENCY_LIST` (code, name, symbol) — используется FT-037 UI. | Dropdown items для preferred_currency. | Import + map на code |
| `frontend/src/locales/{ru,en}.json` | i18n namespaces `owners.form.*`, `ownerStatement.*`. | Новые 3 ключа REQ-07. | Найти существующие namespace, добавить keys |
| `backend/spec/factories/owners.rb` | FactoryBot factory для Owner. | Factory не требует изменений (preferred_currency nullable default). | Если нужно — trait :with_preferred_currency |
| `backend/spec/services/pdf/financial_report_pdf_spec.rb` | Existing regression surface. | CHK-04 регрессионный прогон. | Не трогать |

## Test Strategy

| Test surface | Canonical refs | Planned coverage | Required local/CI commands |
| --- | --- | --- | --- |
| `app/models/owner.rb` | `REQ-01`, `NEG-03`, `CHK-01` | Inclusion validation (valid code, nil, invalid XYZ) | `cd backend && bundle exec rspec spec/models/owner_spec.rb` |
| `app/controllers/api/v1/owners_controller.rb#statement` | `REQ-02..04`, `REQ-06`, `SC-01`, `NEG-01..05`, `CHK-02` | Request-spec: happy path с stored rate, RateNotFound fallback, future clamp, invalid code, foreign org, no permission | `cd backend && bundle exec rspec spec/requests/api/v1/owners_spec.rb` |
| `app/services/pdf/base_pdf.rb` + `owner_statement_pdf.rb` | `REQ-05..07`, `FM-06`, `CHK-03` | PDF rendering spec: currency override переключает CurrencyConfig; fallback-row i18n; zero-revenue result; %PDF magic header | `cd backend && bundle exec rspec spec/services/pdf/owner_statement_pdf_spec.rb` |
| `app/services/pdf/financial_report_pdf.rb` | `EC-06`, `CHK-04` | Regression — existing examples без изменений | `cd backend && bundle exec rspec spec/services/pdf/financial_report_pdf_spec.rb` |
| Full backend suite | All | Regression check | `cd backend && bundle exec rspec` |

## Open Questions / Ambiguities

| OQ | Question | Default | Blocks |
| --- | --- | --- | --- |
| `OQ-01` | Owner PATCH для non-owner memberships — текущая OwnerPolicy требует `finances.manage`? Или отдельный gate для preferred_currency? | Следовать existing OwnerPolicy; если `update?` = `finances.manage`, то и preferred_currency — то же. Проверить в STEP-01. | STEP-04 |
| `OQ-02` | i18n namespace — `ownerStatement.currencyFallbackNotice` новый или `owners.statement.fallback`? | Использовать `ownerStatement.currencyFallbackNotice` (REQ-07 явно). | STEP-06 |
| `OQ-03` | PDF fallback-row — в header или в summary table? | В начале документа (после header), отдельным `text` с `color: "cc0000"` для visibility. | STEP-05 |

## Environment Contract

| Area | Contract |
| --- | --- |
| setup | bundle install, mise trust, master.key симлинк |
| test | RSpec + FactoryBot + WebMock (из FT-037). Dev seeds FT-037 `db/seeds/exchange_rates.rb` уже содержит USD→RUB и другие, так что SC-01 работает в dev |
| secrets | Не требуется новых (FT-037 credentials достаточны) |

## Preconditions

| PRE | Canonical ref | Required state |
| --- | --- | --- |
| `PRE-01` | `feature.md` | `status: active` (Brief принят) |
| `PRE-02` | FT-037 | merged в main; `CurrencyConverter` + `ExchangeRate` доступны в worktree |
| `PRE-03` | `OQ-01` | OwnerPolicy#update? поведение проверено |

## Workstreams

| WS | Implements | Result |
| --- | --- | --- |
| `WS-1` Data | `REQ-01` | Migration + model validation + factory |
| `WS-2` Backend API | `REQ-03..04`, `REQ-06`, `CTR-01..02` | Controller conversion + rescue + new JSON fields |
| `WS-3` PDF | `REQ-05`, `CTR-03` | BasePdf#fmt generalization + OwnerStatementPdf currency awareness + fallback row |
| `WS-4` Frontend | `REQ-02`, `REQ-07` | OwnerListView select + i18n |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Verifies | Check | Blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | — | Grounding: прочесть OwnerPolicy#update?, confirm permission gate (OQ-01). Зафиксировать в plan/comment. | `backend/app/policies/owner_policy.rb` | — | grep check | `PRE-01..03` |
| `STEP-02` | agent | `REQ-01`, `CON-05` | Миграция `add_column :owners, :preferred_currency, :string` + model inclusion validation + spec | `backend/db/migrate/NNN_add_preferred_currency_to_owners.rb`, `backend/app/models/owner.rb`, `backend/spec/models/owner_spec.rb` | `CHK-01` | `bundle exec rspec spec/models/owner_spec.rb` | `STEP-01` |
| `STEP-03` | agent | `REQ-05`, `CTR-03`, `ASM-02` | `Pdf::BasePdf#fmt(cents, currency_override: nil)` signature change + per-call CurrencyConfig lookup | `backend/app/services/pdf/base_pdf.rb` | part of `CHK-03` | — | `STEP-01` |
| `STEP-04` | agent | `REQ-03..04`, `REQ-06`, `CTR-01..02`, `FM-01..02`, `FM-06` | Controller `statement` conversion branch + rescue + strong params + new JSON fields. Request spec SC-01 + NEG-01..05 | `backend/app/controllers/api/v1/owners_controller.rb`, `backend/spec/requests/api/v1/owners_spec.rb` | `CHK-02` | `bundle exec rspec spec/requests/api/v1/owners_spec.rb` | `STEP-02`, `STEP-03` |
| `STEP-05` | agent | `REQ-05..06`, `FM-06` | `OwnerStatementPdf` принимает display-currency в `initialize`, передаёт в `fmt`, рендерит fallback-row при `data[:currency_fallback_reason]`. Spec с %PDF header + fallback row text | `backend/app/services/pdf/owner_statement_pdf.rb`, `backend/spec/services/pdf/owner_statement_pdf_spec.rb` | `CHK-03` | `bundle exec rspec spec/services/pdf/owner_statement_pdf_spec.rb` | `STEP-03`, `STEP-04` |
| `STEP-06` | agent | `REQ-02`, `REQ-07` | OwnerListView.vue: select-поле preferred_currency в dialog + i18n keys в ru.json/en.json | `frontend/src/views/OwnerListView.vue`, `frontend/src/locales/{ru,en}.json` | indirect via CHK-02 end-to-end | manual smoke `yarn dev` | `STEP-04` |
| `STEP-07` | agent | `EC-06` regression | Run FinancialReportPdf spec unchanged | `backend/spec/services/pdf/financial_report_pdf_spec.rb` | `CHK-04` | `bundle exec rspec spec/services/pdf/financial_report_pdf_spec.rb` | `STEP-03` |
| `STEP-08` | agent | all CHK | Сборка artifacts: запустить CHK-01..04 → сохранить logs в `artifacts/ft-038/verify/chk-0{1..4}/` | `artifacts/ft-038/verify/**` | — | — | `STEP-01..07` |

## Parallelizable

- `PAR-01` STEP-03 (BasePdf) и STEP-02 (migration+model) — independent, можно параллельно.
- `PAR-02` STEP-05 (OwnerStatementPdf) требует STEP-03; STEP-06 (frontend) требует STEP-04.
- `PAR-03` STEP-07 regression — independent после STEP-03.

## Checkpoints

| CP | Refs | Condition |
| --- | --- | --- |
| `CP-01` | STEP-01..02 | Data layer готов |
| `CP-02` | STEP-03..04 | Backend API готов, SC-01 зелёный |
| `CP-03` | STEP-05..07 | PDF + frontend + regression зелёные |
| `CP-04` | STEP-08 | Evidence собрана |

## Execution Risks

| ER | Risk | Mitigation |
| --- | --- | --- |
| `ER-01` | `fmt` signature change ломает FinancialReportPdf silently | CHK-04 — regression spec первым действием после STEP-03 |
| `ER-02` | Fallback-row в PDF ломает layout (overlap с header) | Рендерить перед header OR после main header с move_down; manual-inspect first PDF in dev |
| `ER-03` | Strong params не включают preferred_currency → тихо игнорируется при PATCH | Request spec NEG-03 проверяет что invalid code даёт 422, а valid — persists |
| `ER-04` | dev `db/seeds/exchange_rates.rb` не seed'ит нужную пару → SC-01 fail в dev | Factory spec использует `create(:exchange_rate, ...)` напрямую, не полагается на seeds |

## Stop Conditions / Fallback

| Stop | Trigger | Action |
| --- | --- | --- |
| `STOP-01` | FinancialReportPdf spec падает после STEP-03 | Revert `fmt` change; redesign без signature breakage (добавить separate method `fmt_with_currency`) |
| `STOP-02` | Integration спекает SC-01 фейлит с fx_rate_x1e10 = 0 | Revisit DEC-01 (возможно zero-revenue case handle some) |

## Готово для приемки

- CHK-01..04 зелёные.
- EVID-01..04 собраны в artifacts/ft-038/verify/chk-0{1..4}/.
- FinancialReportPdf regression — 0 падений.
- Full backend suite зелёный.
- feature.md → `delivery_status: done`; implementation-plan.md → `status: archived`.
- Code review + simplify review отдельным агентом.
