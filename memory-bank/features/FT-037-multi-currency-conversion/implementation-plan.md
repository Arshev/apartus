---
title: "FT-037: Implementation Plan"
doc_kind: feature
doc_function: derived
purpose: "Execution-план реализации FT-037. Discovery context, 14 шагов по 4 workstream'ам, test strategy, risks, approval gates."
derived_from:
  - feature.md
status: archived
audience: humans_and_agents
must_not_define:
  - ft_037_scope
  - ft_037_architecture
  - ft_037_acceptance_criteria
  - ft_037_blocker_state
---

# План имплементации

## Цель текущего плана

Поставить инфраструктуру конвертации валют FT-037 в рабочем виде: таблица `exchange_rates` с двухуровневым enforcement (DB CHECK + Pundit), HTTP-клиент и daily job к currencyapi.com, сервис `CurrencyConverter` с triangulation и inverse-формулой, admin UI на `/settings/currency-rates`, добавленное permission `currency_rates.manage`, обновлённая domain-документация и новый ADR для DEC-04. Все `CHK-01..06` из `feature.md` зелёные, artefacts собраны в `artifacts/ft-037/verify/`.

## Current State / Reference Points

| Path / module | Current role | Why relevant | Reuse / mirror |
| --- | --- | --- | --- |
| `backend/app/models/concerns/currency_config.rb` | Канонический каталог 11 валют, даёт `CURRENCIES`, `codes`, `config_for(code)` с полем `decimal_places` (2 или 0). | CurrencyConverter читает `decimal_places` для формулы `CON-02`. | **Не трогать** — только читать. Если нужен публичный `decimal_places(code)` helper — добавить коротким методом в конец concern без изменения data. |
| `backend/app/models/concerns/permissions.rb` | `ALL_PERMISSIONS` (18 строк сейчас, docs говорят 20 — `OQ-01`) + `PRESET_ROLES` (`admin`/`manager`/`viewer`). | `REQ-05` добавляет `currency_rates.manage` в `ALL_PERMISSIONS` и в preset `admin`. | Mirror pattern: добавить permission в массив + в `PRESET_ROLES[:admin][:permissions]`. Не трогать manager/viewer. |
| `backend/app/models/current.rb` | `ActiveSupport::CurrentAttributes` с `user`, `organization`, `membership`. | CurrencyConverter получает `organization` параметром, не читает `Current` (pure service). `DEC-04` отменил необходимость `api_context`. | Не трогать. |
| `backend/app/policies/expense_policy.rb` + `application_policy.rb` | Ссылается на `Current.membership&.can?("finances.view")` (pre-existing rename-artifact — docs используют `finance.*`). | Reference pattern для `ExchangeRatePolicy`: наследование от `ApplicationPolicy`, `Current.membership&.can?(...)`, `Scope < ApplicationPolicy::Scope`. | Mirror class shape, но использовать правильный код `currency_rates.manage` (singular, consistent с нашим REQ-05 + добавление в permissions.md). Пре-existing `finances.*` bug out of scope. |
| `backend/app/controllers/api/v1/expenses_controller.rb` (и соседи) | Reference для nested/flat REST controllers под `/api/v1` с Pundit `authorize`. | Шаблон для `ExchangeRatesController`. | Mirror: `before_action :authenticate`, `authorize record`, `Current.organization.exchange_rates...`. |
| `backend/app/jobs/channel_sync_job.rb`, `application_job.rb` | Единственный существующий domain-job. Recurring не подключён. | Reference для structure нового `FetchExchangeRatesJob`. | Mirror: наследование от `ApplicationJob`, queue name, `perform` с rescue-блоками. |
| `backend/config/recurring.yml` | Имеет только cleanup-запись для production. Формат — human-readable (`every hour at minute 12`, `at 5am every day`), НЕ cron-expression. | REQ-02 + DEC-03 говорят `'30 0 * * *'`. Solid Queue через fugit умеет оба формата; проверить — см. `OQ-02`. Предпочесть human-readable для консистентности. | Добавить запись `fetch_exchange_rates:\n  class: FetchExchangeRatesJob\n  schedule: "every day at 00:30 UTC"` в секцию production и (опционально) development. |
| `backend/app/services/price_calculator.rb`, `notification_sender.rb` | Pure services — plain Ruby classes без naming convention. | Reference для `CurrencyConverter` и `CurrencyApiClient` shape. | Mirror: class method `.call` ИЛИ instance-based — выбрать plain class с class methods (как `price_calculator`). |
| `backend/db/seeds.rb` + соседние seed files | `seeds.rb` — entry point. Разбиения по sub-files ещё нет. | REQ-09 требует `db/seeds/exchange_rates.rb` условно для dev. | Создать `db/seeds/exchange_rates.rb`, подключить через `load Rails.root.join('db/seeds/exchange_rates.rb') if Rails.env.development?`. |
| `frontend/src/views/settings/` (существующие settings views) | Reference для нового `CurrencyRatesView.vue`: layout, Vuetify components, i18n keys. | Mirror pattern для UI двух панелей. | `grep -rn "settings" frontend/src/views/` — найти ближайший пример (OrganizationSettingsView или аналог) и mirror компоновку. |
| `memory-bank/adr/ADR-012-class-level-authorize-nested-controllers.md` | Canonical authorization pattern — class-level `authorize ResourceClass` + nested resolver. | `ExchangeRate` — top-level resource, не nested. Pattern частично применим (Scope resolve есть), но class-level authorize без parent. | Использовать ApplicationPolicy::Scope pattern из `expense_policy.rb` (top-level), не nested parent-resolver. |
| `memory-bank/adr/ADR-004-integer-cents-for-money.md` | ADR о integer-only arithmetic. | Обоснование `half_even_div` в CurrencyConverter. | Canonical input для CON-02 формулы. |

## Test Strategy

| Test surface | Canonical refs | Existing coverage | Planned automated coverage | Required local suites / commands | Required CI suites / jobs | Manual-only gap / justification | Manual-only approval ref |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `app/services/currency_converter.rb` | `REQ-01`, `REQ-03`, `SC-01`, `SC-02`, `SC-03`, `NEG-01`, `NEG-02`, `CHK-01` | none | RSpec unit-spec: same-currency short-circuit, same-decimals SC-01, cross-decimals SC-02 + round-trip MET-03, triangulation SC-03, inverse-formula path, RateNotFound NEG-01/02 | `cd backend && bundle exec rspec spec/services/currency_converter_spec.rb` | `backend-rspec` CI job | none | none |
| `app/services/currency_api_client.rb` | `REQ-02`, `CTR-01`, `FM-02`, `FM-03`, `NEG-09`, `NEG-10`, `CHK-02` | none | RSpec request-stub через WebMock: happy-path JSON parse, 401 → Unauthorized, partial response, timeout | `cd backend && bundle exec rspec spec/services/currency_api_client_spec.rb` | `backend-rspec` | none | none |
| `app/jobs/fetch_exchange_rates_job.rb` | `REQ-02`, `REQ-07`, `EC-02`, `SC-04`, `SC-06`, `NEG-09`, `NEG-10`, `CHK-02` | none | RSpec job-spec: idempotency (2 runs = 10 rows), exact 1 HTTP request per run, credentials missing → early return, 401 → fail-fast (no retry loop in test), partial response warning | `cd backend && bundle exec rspec spec/jobs/fetch_exchange_rates_job_spec.rb` | `backend-rspec` | none | none |
| `app/models/exchange_rate.rb` + migration | `REQ-01`, `CON-06`, `DEC-04`, `FM-06`, `FM-07`, `FM-08`, `FM-09`, `NEG-11`, `CHK-04` | none | RSpec model-spec: validations (presence/inclusion/numericality/unique), enum source, scopes (`global`, `for_organization`, `effective_on`), DB CHECK constraint rejection via raw SQL | `cd backend && bundle exec rspec spec/models/exchange_rate_spec.rb` | `backend-rspec` | none | none |
| `app/controllers/api/v1/exchange_rates_controller.rb` + `exchange_rate_policy.rb` | `REQ-04`, `REQ-05`, `REQ-06`, `EC-03`, `EC-04`, `EC-05`, `SC-05`, `NEG-03..08`, `CHK-03` | none | RSpec request-spec (CRUD happy-path, scope isolation org A/B, 403 for NULL row mutate, 404 for foreign org id, permission denied) + policy-spec (Scope#resolve + authorize methods) | `cd backend && bundle exec rspec spec/requests/api/v1/exchange_rates_spec.rb spec/policies/exchange_rate_policy_spec.rb` | `backend-rspec` | none | none |
| `frontend/src/stores/exchangeRates.js` + `CurrencyRatesView.vue` | `REQ-06`, `EC-03`, `CHK-05` | none | Vitest store-spec (actions, state transitions) + component-spec (two panels render, create/edit/delete flow с stub API) | `cd frontend && yarn test src/__tests__/stores/exchangeRates.test.js src/__tests__/views/settings/CurrencyRatesView.test.js` | `frontend-vitest` | Playwright e2e для UI settings — deferred; admin UI ручную dev-проверку достаточно для MVP | `AG-02` |
| `memory-bank/domain/money-and-currency.md` + `UC-006-daily-fx-fetch.md` | `REQ-08`, `REQ-10`, `EC-06`, `CHK-06` | doc says "No FX / No Multi-Currency" в секции внизу | Grep-based check (`grep -q "Conversion (FT-037)"` + `! grep -q "No FX / No Multi-Currency"`) + `test -f` для UC | `bash artifacts/ft-037/verify/chk-06/verify.sh` (написать scriptlet) | none (doc-only) | doc-validate lint может быть manual до появления automated hook | `none` |
| Rails credentials — production/development | `REQ-07` | none | Manual: `rails credentials:edit --environment production/development` с ключом `currencyapi.api_key`. Test env стабится WebMock'ом. | `bin/rails credentials:show -e production` для проверки (не коммитится) | none | Secrets management — manual per environment. | `AG-03` |

## Open Questions / Ambiguities

| Open Question ID | Question | Why unresolved | Blocks | Default action / escalation owner |
| --- | --- | --- | --- | --- |
| `OQ-01` | `permissions.md` утверждает 20 permissions, `permissions.rb` содержит 18 (похоже отсутствуют `channels.manage`/`channels.view` или аналог). Это рассогласование pre-existing. Наш `currency_rates.manage` станет 19-й или 21-й? | Не имеет влияния на semantics FT-037, но нарушает doc-consistency. | `STEP-10` (обновление permissions.md с новой permission) | Default: добавить `currency_rates.manage` в `ALL_PERMISSIONS` + admin preset, обновить doc до актуального count с нашей permission. Pre-existing gap (18 vs 20) — вынести в отдельный bugfix, upstream to human. Owner: author. |
| `OQ-02` | `backend/config/recurring.yml` использует human-readable schedule (`every day at 00:30`). Поддерживает ли Solid Queue/fugit cron-expression `'30 0 * * *'`? | `DEC-03` формулирован как cron, но проект использует другой диалект. | `STEP-07` (recurring.yml entry) | Default: использовать human-readable `"every day at 00:30 UTC"`. Если Solid Queue не принимает — fallback к cron. Owner: author. |
| `OQ-03` | `ExpensePolicy` использует permission code `finances.view` (plural), но `permissions.md` + `permissions.rb` говорят `finance.view` (singular). Это pre-existing mismatch. Наш policy использует `currency_rates.manage` — правильно. | Не влияет на FT-037, но если reviewer попросит "fix pre-existing" — out of scope. | none | Не трогать. Out of scope для FT-037. |
| `OQ-04` | Frontend dir structure — `frontend/src/views/settings/` существует или нужно создавать? | `STEP-11` требует путь. | `STEP-11` | Default: проверить `ls frontend/src/views/` в момент шага; если settings-subdir нет — создать. Owner: author. |
| `OQ-05` | ~~Использовать ли `Faraday`~~ **RESOLVED (2026-04-24):** `bundle show faraday` в worktree — gem отсутствует. Используем `Net::HTTP` из stdlib (OK без AG). | `STEP-05`. | `STEP-05` | Resolved: `Net::HTTP` + `URI.parse` + `Net::HTTP.get_response`. |
| `OQ-06` | `insert_all ... on_duplicate: :update` — корректный синтаксис в Rails 8 для upsert с update всех колонок? Нужна ли явная `on_duplicate: :update_all_excluded`? | `STEP-06`. | `STEP-06` | Default: Rails 8 поддерживает `upsert_all(records, unique_by: [...])` — использовать его; он update'ит non-conflict columns по умолчанию. Owner: author. |
| `OQ-07` | `webmock` gem отсутствует в `backend/Gemfile` group :test, но весь HTTP test support (CHK-02, ER-01, CurrencyApiClient/Job specs) его требует. `NS-08` запрещает новые gems без одобрения. Self-rolled `Net::HTTP` stub — x10 сложнее и хрупче. | `STEP-05`, `STEP-06` | `STEP-05` (client spec blocker), `STEP-06` (job spec blocker) | Default: escalate через `AG-05` — добавить `webmock` в `group :test`. Если escalation denied — self-rolled `Net::HTTP` stub в `spec/support/currency_api_stub.rb` (переопределение `CurrencyApiClient.latest` в specs через RSpec mock). Owner: author, escalate to human. |

## Environment Contract

| Area | Contract | Used by | Failure symptom |
| --- | --- | --- | --- |
| setup | mise установлен, `bash init.sh` отработал в worktree; master.key симлинкнут (уже сделано). `bundle install` проходит; `yarn install` во frontend проходит. | all | `bundle exec rspec` падает с "Rails not loaded" / frontend dev server не поднимается. |
| test — backend | `cd backend && bundle exec rspec` — canonical. RSpec 3+, FactoryBot включены. WebMock — **TBD через OQ-07/AG-05** (gem отсутствует, требует approval). Database reset между specs через transactional fixtures; для CHECK-constraint тестов (NEG-11) отдельные examples с `use_transactional_fixtures: false` — constraint срабатывает на INSERT, до commit. | `CHK-01..04` | `rspec` не находит specs, HTTP-stub отсутствует и тесты бьют реальный currencyapi.com, transactional fixtures глотают CHECK violations. |
| test — frontend | `cd frontend && yarn test` (Vitest). | `CHK-05` | `yarn test` не найдет spec-файлы или Pinia mock не работает. |
| access / network / secrets | В dev + test — НЕТ запросов к currencyapi.com. Dev: stub через `db/seeds/exchange_rates.rb` или пустая БД + manual override. Test: WebMock блокирует все outbound HTTP, stub для `api.currencyapi.com/v3/latest` через `spec/support/currency_api_stub.rb`. Production: API key в credentials (см. `AG-03`). | `STEP-05`, `STEP-06`, test specs | Test spec делает реальный HTTP → WebMock raise `WebMock::NetConnectNotAllowedError`. Job в dev бьёт currencyapi без key → early-return (FM-10). |

## Preconditions

| Precondition ID | Canonical ref | Required state | Used by steps | Blocks start |
| --- | --- | --- | --- | --- |
| `PRE-01` | `feature.md` | `status: active` (Brief принят) | all | yes |
| `PRE-02` | `DEC-04` / ADR-NNN | Новый ADR draft создан, либо DEC-04 явно принят как proposed в ADR Dependencies | `STEP-02` (миграция с CHECK), `STEP-03` (model) | no (можно стартовать с draft ADR) |
| `PRE-03` | `ASM-01` | currencyapi.com free tier ≥ 300 req/mo подтверждён (проверить docs до начала) | `STEP-05` | yes для prod key, no для dev |
| `PRE-04` | `ASM-03` | `CurrencyConfig.decimal_places(code)` public helper существует или добавлен в `STEP-01` | `STEP-04` (CurrencyConverter) | yes |
| `PRE-05` | `AG-03` | Approval на получение prod API key от currencyapi.com | `STEP-13` (prod credentials) | no (dev/test без блокировки) |

## Workstreams

| Workstream | Implements | Result | Owner | Dependencies |
| --- | --- | --- | --- | --- |
| `WS-1` Data layer | `REQ-01`, `REQ-05`, `CON-06`, `DEC-04`, `CTR-04` (schema part) | Migration, model, factory, permission, ADR | agent | `PRE-01`, `PRE-02`, `PRE-04` |
| `WS-2` HTTP + Job | `REQ-02`, `REQ-07`, `REQ-09`, `CTR-01`, `FM-01..03`, `FM-10` | CurrencyApiClient, FetchExchangeRatesJob, recurring.yml, dev seeds, WebMock stub support | agent | `WS-1` (model exists) |
| `WS-3` Service + API | `REQ-03`, `REQ-04`, `CTR-02`, `CTR-03`, `CON-02`, `DEC-01` | CurrencyConverter, ExchangeRatePolicy, ExchangeRatesController, routes, request/policy specs | agent | `WS-1` (model, permission) |
| `WS-4` Frontend + Docs | `REQ-06`, `REQ-08`, `REQ-10`, `CTR-03` | api client, Pinia store, CurrencyRatesView, i18n, router, frontend specs, money-and-currency.md update, UC-006, permissions.md update, ADR-NNN finalize | agent | `WS-3` (API stable) |

## Approval Gates

| Approval Gate ID | Trigger | Applies to | Why approval is required | Approver / evidence |
| --- | --- | --- | --- | --- |
| `AG-01` | Необходимость нового gem (если `OQ-05` зарезолвится к gem) | `STEP-05` | `CON-05` / autonomy-boundaries: новые gems без разрешения запрещены | Human approval в сессии / явная директива |
| `AG-02` | Пропуск Playwright e2e для `/settings/currency-rates` | `STEP-11`, `STEP-12` | Feature-policy требует E2E для UI critical paths | Разовое разрешение на отсутствие e2e при наличии unit/integration coverage |
| `AG-03` | Получение production API key для currencyapi.com и запись в production credentials | `STEP-13` | Secrets operation; стоит $$ и требует аккаунта. | Human approval, ссылка на signup/billing evidence |
| `AG-04` | Проход автор-only self-review. Нужен launch отдельного агента для code-review → simplify-review (перед Execution → Done) | Final stage (вне текущего плана) | Lifecycle enforcement: автор ≠ ревьюер | Agent launch с `memory-bank/flows/prompts/code-review.md`, артефакт в `artifacts/ft-037/review/code-review/` |
| `AG-05` | Добавление `webmock` gem в `backend/Gemfile` group :test | `STEP-05`, `STEP-06`, test infra | `NS-08` запрещает gems без approval; test-only, не попадает в production bundle | Human approval в сессии; фиксируется `OQ-07` resolution |

## Порядок работ

| Step ID | Actor | Implements | Goal | Touchpoints | Artifact | Verifies | Evidence IDs | Check command / procedure | Blocked by | Needs approval | Escalate if |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STEP-01` | agent | `ASM-03`, `REQ-05` | Добавить `CurrencyConfig.decimal_places(code)` helper + `currency_rates.manage` permission в `ALL_PERMISSIONS` и `PRESET_ROLES[:admin]` | `backend/app/models/concerns/currency_config.rb`, `backend/app/models/concerns/permissions.rb` | Два concern файла обновлены | `EC-03` (permission exists) | `EVID-04` | `grep -q '"currency_rates.manage"' backend/app/models/concerns/permissions.rb && ruby -r./backend/app/models/concerns/permissions -e 'exit (Permissions::ALL_PERMISSIONS.include?("currency_rates.manage") && Permissions::PRESET_ROLES.dig(:admin, :permissions).include?("currency_rates.manage")) ? 0 : 1'` | `PRE-01` | none | Reflection если permission name ломает consumer'ы |
| `STEP-02` | agent | `REQ-01`, `CON-06`, `DEC-04` | Миграция `CreateExchangeRates` с unique + partial index + CHECK constraint + ADR draft для DEC-04 | `backend/db/migrate/<ts>_create_exchange_rates.rb`, `backend/db/schema.rb`, `memory-bank/adr/ADR-NNN-db-check-enforces-exchange-rate-invariant.md` (create с `decision_status: proposed`) | Таблица создана, миграция прошла, ADR draft commit'нут | `EC-01`, `EC-02`, `NEG-11` | `EVID-04` | `bin/rails db:migrate` + `psql -c "\d exchange_rates"` проверить constraints + `test -f memory-bank/adr/ADR-*-db-check-enforces-exchange-rate-invariant.md` | `PRE-02` | none | Если PG версия не поддерживает partial unique index — escalate |
| `STEP-03` | agent | `REQ-01`, `FM-06..09`, `DEC-04` | Модель `ExchangeRate` + factory + model spec | `backend/app/models/exchange_rate.rb`, `backend/spec/factories/exchange_rates.rb`, `backend/spec/models/exchange_rate_spec.rb` | Spec зелёный | `CHK-04`, `NEG-11` | `EVID-04` | `bundle exec rspec spec/models/exchange_rate_spec.rb` | `STEP-02` | none | DB CHECK не срабатывает из-за transactional fixtures — использовать `use_transactional_fixtures: false` для соответствующих examples |
| `STEP-04` | agent | `REQ-03`, `CON-02`, `DEC-01`, `DEC-02` | Сервис `CurrencyConverter` + half_even_div + triangulation + inverse | `backend/app/services/currency_converter.rb`, `backend/spec/services/currency_converter_spec.rb`, `backend/spec/support/currency_api_stub.rb` | Spec зелёный, math SC-01/02/03 верифицирован | `CHK-01`, `SC-01..03`, `NEG-01..02`, `MET-03` | `EVID-01` | `bundle exec rspec spec/services/currency_converter_spec.rb` | `STEP-01`, `STEP-03` | none | Round-trip UZS→USD→UZS даёт ошибку > 1e-7 — пересмотреть precision (DEC-02 revisit) |
| `STEP-05` | agent | `REQ-02`, `CTR-01`, `FM-01..03`, `NEG-09..10` | `CurrencyApiClient` (plain Ruby через Net::HTTP per OQ-05) + spec + WebMock bootstrap в `spec/rails_helper.rb` | `backend/app/services/currency_api_client.rb`, `backend/spec/services/currency_api_client_spec.rb`, `backend/spec/support/currency_api_stub.rb`, `backend/spec/rails_helper.rb` (добавить `require 'webmock/rspec'` + `WebMock.disable_net_connect!(allow_localhost: true)`), `backend/Gemfile` (`gem 'webmock', group: :test` после AG-05) | Spec зелёный | `CHK-02` (часть) | `EVID-02` | `bundle exec rspec spec/services/currency_api_client_spec.rb` | `STEP-01`, `OQ-07`/`AG-05` | `AG-05` (webmock gem) | AG-05 denied → fallback на self-rolled stub (OQ-07 alternative), спец complexity растёт |
| `STEP-06` | agent | `REQ-02`, `REQ-07`, `SC-04`, `SC-06`, `FM-05` | `FetchExchangeRatesJob` (upsert, early-return без key, fail-fast on 401) + spec | `backend/app/jobs/fetch_exchange_rates_job.rb`, `backend/spec/jobs/fetch_exchange_rates_job_spec.rb` | Spec зелёный; WebMock request count = 1 | `CHK-02`, `MET-02` | `EVID-02` | `bundle exec rspec spec/jobs/fetch_exchange_rates_job_spec.rb` | `STEP-03`, `STEP-05` | none | Idempotency fail → revisit unique index |
| `STEP-07` | agent | `REQ-02`, `DEC-03` | Добавить recurring-запись в `config/recurring.yml` | `backend/config/recurring.yml` | Запись добавлена в production (+ опц. dev) | `EC-02` | `EVID-02` | `bin/rails solid_queue:dispatch_recurring` — job появится в очереди по расписанию (локально: manual trigger + лог) | `STEP-06` | none | Solid Queue не понимает формат — fallback на cron syntax (OQ-02) |
| `STEP-08` | agent | `REQ-09` | Dev seeds для пустой dev БД | `backend/db/seeds/exchange_rates.rb`, `backend/db/seeds.rb` (conditional load) | Seeds добавлены | `EC-02` (dev-level) | `EVID-02` | `RAILS_ENV=development bin/rails db:seed` — 10 rows появляются | `STEP-03` | none | Если seed бьёт валидацию (например rate=0) — fix seed данных |
| `STEP-09` | agent | `REQ-04`, `REQ-05`, `CTR-03`, `CTR-04`, `CON-03`, `CON-06` | `ExchangeRatePolicy` (Scope + authorize) + policy spec | `backend/app/policies/exchange_rate_policy.rb`, `backend/spec/policies/exchange_rate_policy_spec.rb` | Spec зелёный; read/mutate scope разделены | `CHK-03`, `NEG-03..04, 08` | `EVID-03` | `bundle exec rspec spec/policies/exchange_rate_policy_spec.rb` | `STEP-01`, `STEP-03` | none | Scope.resolve не возвращает ожидаемый subset — revisit CON-03 |
| `STEP-10` | agent | `REQ-04`, `REQ-05`, `CTR-03`, `CTR-04`, `FM-11..12` | `ExchangeRatesController` + routes + request spec; убедиться что в `Api::V1::BaseController` (или глобально) настроен `rescue_from Pundit::NotAuthorizedError` → 403 и `rescue_from ActiveRecord::RecordNotFound` → 404 (если уже нет — добавить) для корректного разделения EC-04 (404 чужая org) vs EC-05 (403 NULL row) | `backend/app/controllers/api/v1/exchange_rates_controller.rb`, `backend/app/controllers/api/v1/base_controller.rb` (rescue_from если нужно), `backend/config/routes.rb`, `backend/spec/requests/api/v1/exchange_rates_spec.rb` | Spec зелёный; SC-05 end-to-end; 403/404 разделены явными examples | `CHK-03`, `EC-03..05`, `SC-05`, `NEG-03`, `NEG-05..08` | `EVID-03` | `bundle exec rspec spec/requests/api/v1/exchange_rates_spec.rb` | `STEP-09` | none | 403/404 не разделены корректно — revisit policy |
| `STEP-11` | agent | `REQ-06`, `CTR-03` | Frontend: axios client + Pinia store + CurrencyRatesView с двумя панелями + router route + i18n ru/en | `frontend/src/api/exchangeRates.js`, `frontend/src/stores/exchangeRates.js`, `frontend/src/views/settings/CurrencyRatesView.vue`, `frontend/src/router/index.js`, `frontend/src/locales/{ru,en}.json` | UI рендерится локально при `yarn dev`; создание/редактирование/удаление работает через API | `EC-03` | `EVID-05` | manual smoke в браузере + next step spec | `STEP-10` (API ready) | `AG-02` (отказ от e2e) | Vuetify-версия нелегко решает layout — escalate для design help |
| `STEP-12` | agent | `REQ-06`, `CHK-05` | Vitest specs для store + view | `frontend/src/__tests__/stores/exchangeRates.test.js`, `frontend/src/__tests__/views/settings/CurrencyRatesView.test.js` | Specs зелёные | `CHK-05` | `EVID-05` | `cd frontend && yarn test` | `STEP-11` | none | Pinia mock не покрывает axios interceptors — использовать MSW или аналог |
| `STEP-13` | human + agent | `REQ-07`, `AG-03` | Записать API key в per-env credentials (текущий state: shared `config/credentials.yml.enc`; per-env файлы создаются командой `rails credentials:edit --environment <env>` и коммитятся без master.key) | `backend/config/credentials/production.yml.enc` (создаётся командой), `backend/config/credentials/development.yml.enc` (создаётся командой, опционально) | Key доступен через `Rails.application.credentials.currencyapi.api_key` | `EC-02` (prod) | `EVID-02` | `bin/rails credentials:show --environment production \| grep currencyapi` | `AG-03` | `AG-03` | Нет billing approval — prod ключ не устанавливаем, job останавливается на early-return |
| `STEP-14a` | agent | `REQ-08`, `EC-06` | Обновить domain docs — снять "No FX" + добавить секцию "Conversion (FT-037)" + актуализировать schema/api-reference/permissions | `memory-bank/domain/money-and-currency.md`, `memory-bank/domain/schema.md`, `memory-bank/domain/api-reference.md`, `memory-bank/domain/permissions.md` | 4 doc-файла обновлены | `CHK-06` (часть) | `EVID-06` | `grep -q "Conversion (FT-037)" memory-bank/domain/money-and-currency.md && ! grep -q "No FX / No Multi-Currency" memory-bank/domain/money-and-currency.md && grep -q "ExchangeRate" memory-bank/domain/schema.md && grep -q "currency_rates.manage" memory-bank/domain/permissions.md` | `STEP-01..12` | none | Doc-validate ругается на orphan-ссылки — исправить на месте |
| `STEP-14b` | agent | `REQ-10`, `EC-06` | Создать `UC-006-daily-fx-fetch.md` документирующий устойчивый сценарий | `memory-bank/use-cases/UC-006-daily-fx-fetch.md` | UC файл создан с frontmatter `status: active` | `CHK-06` (часть) | `EVID-06` | `test -f memory-bank/use-cases/UC-006-daily-fx-fetch.md` | `STEP-14a` | none | UC template missing → заимствовать структуру из `memory-bank/use-cases/README.md` |
| `STEP-14c` | agent | `DEC-04`, `EC-06` | Финализировать ADR-NNN (draft → accepted) после plan-review sign-off; обновить frontmatter `decision_status: accepted` + добавить ссылки в FT-037 feature.md ADR Dependencies | `memory-bank/adr/ADR-NNN-db-check-enforces-exchange-rate-invariant.md`, `memory-bank/features/FT-037-multi-currency-conversion/feature.md` (уточнить ADR path) | ADR в `accepted` | `CHK-06` (часть) | `EVID-06` | `grep -q 'decision_status: accepted' memory-bank/adr/ADR-*-db-check-enforces-exchange-rate-invariant.md` | `STEP-02` (draft), Plan review sign-off | none | ADR отвергнут ревьюером — STOP-01 branch, revisit DEC-04 |

## Parallelizable Work

- `PAR-01` `STEP-04` (CurrencyConverter) и `STEP-05` (CurrencyApiClient) — независимые сервисы, разные файлы, общий blocker только `STEP-01` (helper + permission).
- `PAR-02` `STEP-11` (UI) и `STEP-14a/b/c` (docs, UC, ADR финализация) — разные change surfaces, можно идти параллельно после `STEP-10`.
- `PAR-03` `STEP-02` + `STEP-03` последовательны (модель зависит от миграции), НЕ параллелить.
- `PAR-04` `STEP-06` (Job) требует `STEP-03` (model) + `STEP-05` (client) — ждёт обоих.
- `PAR-05` `STEP-09` (Policy) + `STEP-04` (Converter) — независимы, оба ждут `STEP-01`+`STEP-03`, можно параллелить.

## Checkpoints

| Checkpoint ID | Refs | Condition | Evidence IDs |
| --- | --- | --- | --- |
| `CP-01` | `STEP-01..03` | Data layer готов: permission добавлена, миграция прошла, модель + factory + specs зелёные | `EVID-04` |
| `CP-02` | `STEP-04..08` | Backend compute + fetch готовы: converter, client, job, recurring-запись, dev seeds | `EVID-01`, `EVID-02` |
| `CP-03` | `STEP-09..10` | API layer готов: policy + controller + request-spec end-to-end (SC-05) | `EVID-03` |
| `CP-04` | `STEP-11..12` | UI layer готов: frontend specs зелёные, manual smoke OK | `EVID-05` |
| `CP-05` | `STEP-13`, `STEP-14a`, `STEP-14b`, `STEP-14c` | Secrets + docs + UC + ADR финализированы; `CHK-06` grep check passes | `EVID-06` |
| `CP-06` | all CHK | Все `CHK-01..06` зелёные, artefacts собраны в `artifacts/ft-037/verify/chk-XX/` | all `EVID-*` |

## Execution Risks

| Risk ID | Risk | Impact | Mitigation | Trigger |
| --- | --- | --- | --- | --- |
| `ER-01` | После получения `AG-05` WebMock блокировка не активирована по всем specs (забыли `WebMock.disable_net_connect!` в rails_helper) | Тест бьёт currencyapi, квота тратится | STEP-05 touchpoints явно включают `spec/rails_helper.rb` с `require 'webmock/rspec'` + `WebMock.disable_net_connect!(allow_localhost: true)`; проверить первым действием после gem install | Spec, который должен упасть (реальный HTTP), зелёный; CI бьёт external API |
| `ER-08` | `AG-05` отклонён — self-rolled stub для Net::HTTP усложняет specs и повышает maintenance-cost | STEP-05/06 занимают значительно больше времени, есть риск test-flakiness | OQ-07 alternative: fallback в `spec/support/currency_api_stub.rb` — RSpec mock `CurrencyApiClient.latest` на уровне service boundary, без перехвата низкоуровневых HTTP. CTR-01 остаётся pure-method contract. | AG-05 denial |
| `ER-02` | DB CHECK constraint блокирует seeds / factory (если factory default'ы ломают invariant) | specs падают массово | FactoryBot defaults: `source: :api, organization_id: nil` для base factory, `manual` trait переопределяет оба поля вместе | Массовый `PG::CheckViolation` в specs сразу после миграции |
| `ER-03` | Precision `rate_x1e10` всё же недостаточна для UZS↔USD (MET-03 < 1e-7 fail) | Revisit DEC-02 — увеличить до x1e12 | Round-trip spec первым: если fail — stop, escalate via DEC revision, не продолжать | Round-trip assertion падает в `STEP-04` |
| `ER-04` | currencyapi.com JSON schema отличается от предположенного (`data: {CODE: {value: ...}}`) | Парсер ломается на проде | В `CurrencyApiClient` защитный `response.dig(:data, code, :value)` + fallback на logging + FM-03 branch. Fixture JSON взять из реальных API docs на момент STEP-05 | Parse error в production log |
| `ER-05` | Solid Queue recurring не подхватывает новую запись без перезапуска workers | Job не запускается в dev | В STEP-07 задокументировать команду `bin/jobs restart` или эквивалент в acceptance checklist | Job не видно в dashboard после deploy |
| `ER-06` | Pre-existing `ExpensePolicy` bug (`finances.*`) создаёт coaching-temptation fix'ить в FT-037 | Scope creep | `OQ-03` — явно out of scope | Reviewer или автор предлагает "заодно починить" |
| `ER-07` | DEC-04 ADR обсуждение затягивает план review | Plan review blocker | ADR стартует в STEP-02 с `decision_status: proposed`, финализируется в STEP-14 после plan-review sign-off | Plan review #1 возвращает замечание "DEC-04 без ADR" |

## Stop Conditions / Fallback

| Stop ID | Related refs | Trigger | Immediate action | Safe fallback state |
| --- | --- | --- | --- | --- |
| `STOP-01` | `DEC-02`, `ER-03` | Round-trip MET-03 ошибка > 1e-7 на any pair | Не продолжать WS-3+, вернуться к DEC-02 | Plan в `status: draft`, blocker "DEC-02 precision insufficient" |
| `STOP-02` | `AG-01` | Обнаружена необходимость нового gem в `STEP-05` | Не продолжать `STEP-05`, эскалация | `CurrencyApiClient` not implemented, Job не пишется, план paused |
| `STOP-03` | `OQ-01`, `ER-06` | Автор начинает чинить pre-existing bug (`finances.*` rename) | Revert изменение, вынести в отдельную задачу | Change surface остаётся в рамках FT-037 |
| `STOP-04` | `NS-02` scope creep | Автор начинает интегрировать CurrencyConverter в Reports/Dashboard/PDF | Revert, консюмер — отдельная фича | FT-037 остаётся инфраструктурой |
| `STOP-05` | `CP-03` | SC-05 end-to-end fails (POST создаёт row, но `.convert` её не видит) | Stop, debug transactional scope / Current.organization binding | Plan paused, issue в `state.yml` blockers |

## Готово для приемки

Все условия одновременно:

- `CP-01..06` пройдены, все CHK-01..06 зелёные (эталонный запуск: `cd backend && bundle exec rspec spec/services/currency_converter_spec.rb spec/services/currency_api_client_spec.rb spec/jobs/fetch_exchange_rates_job_spec.rb spec/models/exchange_rate_spec.rb spec/requests/api/v1/exchange_rates_spec.rb spec/policies/exchange_rate_policy_spec.rb && cd ../frontend && yarn test src/__tests__/stores/exchangeRates.test.js src/__tests__/views/settings/CurrencyRatesView.test.js && bash ../artifacts/ft-037/verify/chk-06/verify.sh`).
- Все `EVID-01..06` заполнены конкретными файлами/логами в `artifacts/ft-037/verify/chk-XX/`.
- `feature.md` → `delivery_status: done`; `implementation-plan.md` → `status: archived`.
- `ADR-NNN-db-check-enforces-exchange-rate-invariant.md` → `decision_status: accepted`.
- Code-review и simplify-review (отдельными агентами, автор ≠ ревьюер) завершены, замечания закрыты (см. `AG-04`).
- `memory-bank/features/README.md` индекс обновлён: FT-037 → `done`.
