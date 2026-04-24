---
title: "FT-037: Multi-currency Conversion"
doc_kind: feature
doc_function: canonical
purpose: "Инфраструктура конвертации валют: суточные курсы из currencyapi.com + per-org manual overrides + унифицированный сервис CurrencyConverter. Консюмеры (reports/dashboard/PDF/owner module) подключаются отдельными фичами."
derived_from:
  - ../../domain/problem.md
  - ../../domain/money-and-currency.md
  - ../../domain/permissions.md
  - ../../adr/ADR-004-integer-cents-for-money.md
  - ../../adr/ADR-012-class-level-authorize-nested-controllers.md
  - ../FT-015-configurable-currency/feature.md
status: active
delivery_status: done
audience: humans_and_agents
must_not_define:
  - implementation_sequence
  - consumer_integration
---

# FT-037: Multi-currency Conversion

## What

### Problem

Текущее правило `domain/money-and-currency.md` — «No FX / No Multi-Currency»: каждая организация ведёт всё в одной валюте (FT-015). Достаточно, пока весь домен монолингвален по валюте, но блокирует:

- отчёты / owner statements в валюте, отличной от базовой валюты организации;
- миграцию организации на другую базовую валюту (исторические суммы нужно показывать в новой валюте по курсу на дату записи);
- будущий per-property currency (объект в Таиланде у российской УК).

Ни один из сценариев не закрывается без источника курсов и сервиса конвертации. Фича даёт **инфраструктуру** — fetch, хранение, override, converter, admin UI. Интеграция в reports, dashboard, PDF, owner module — NS-02, отдельные фичи.

### Outcome

| Metric ID | Metric | Baseline | Target | Measurement method |
| --- | --- | --- | --- | --- |
| `MET-01` | Хранимые API rows после первого успешного fetch | 0 | Ровно 10 rows (`base=USD, quote ∈ CurrencyConfig.codes \ {USD}`). Reverse direction (X→USD) и cross-pairs (X→Y, X≠USD) — runtime через inverse-формулу и triangulation без persist (см. DEC-01) | `ExchangeRate.where(source: :api, effective_date: Date.current).distinct.count(:quote_currency) == 10` + service-spec coverage inverse/triangulation |
| `MET-02` | API-квота currencyapi.com | 0/плановый лимит | ≤ 1 request/day (≤ 31/месяц, free tier = 300/mo) | Счётчик вызовов `CurrencyApiClient.latest` за 30 дней через `ActiveSupport::Notifications` log |
| `MET-03` | Precision конвертации для пар с разными decimals (USD↔UZS) | n/a | относительная ошибка < 1e-7 на round-trip | RSpec scenario с round-trip assertion |

### Scope

- `REQ-01` Модель `ExchangeRate`: `base_currency` (string, ISO code), `quote_currency` (string, ISO code), `rate_x1e10` (bigint, positive), `effective_date` (date), `source` (enum: `api` | `manual`), `organization_id` (nullable FK), `note` (text, для manual), timestamps. Unique index `(base_currency, quote_currency, effective_date, source, organization_id)` + partial index `WHERE organization_id IS NULL`.
- `REQ-02` Daily job `FetchExchangeRatesJob` вызывает `CurrencyApiClient.latest(base: 'USD', currencies: CurrencyConfig.codes - ['USD'])` — **один** HTTP-запрос в день, upsert rows `source=api, organization_id=NULL, effective_date=Date.current` по unique index. Идемпотентен: `insert_all ... on_duplicate: :update_all_excluded` (или PG `ON CONFLICT DO UPDATE`).
- `REQ-03` Сервис `CurrencyConverter.convert(amount_cents:, from:, to:, at:, organization:)` возвращает integer minor units целевой валюты. Приоритет rate: `manual-for-org` > `api-global`. Внутри источника: `max(effective_date) WHERE effective_date <= at`. Same-currency → return `amount_cents`. Non-USD пара (например RUB→EUR) — triangulation через USD **в runtime, без сохранения производного rate** (см. DEC-01). Rate не найден → `raise CurrencyConverter::RateNotFound`.
- `REQ-04` REST endpoint `GET /api/v1/exchange_rates` возвращает эффективный view: API rates (read-only, `organization_id IS NULL`) + manual overrides текущей организации. `POST/PATCH/DELETE /api/v1/exchange_rates[/:id]` доступны membership'ам с permission `currency_rates.manage` и только для rows с `organization_id = Current.organization.id` (см. разделение read/mutate scope в CON-03). Попытка мутировать `organization_id IS NULL` row → 403 (row видна в read scope, но `policy.update?` возвращает false). Попытка мутировать row другой org → 404 (row не в mutate scope).
- `REQ-05` Permission `currency_rates.manage` добавляется в `Permissions::ALL_PERMISSIONS` (19-я permission; `permissions.rb` содержал 18 до FT-037) и включается в preset role `admin` по умолчанию. В preset ролях `manager` и `viewer` — off. Membership с `role_enum: :owner` имеет доступ автоматически через bypass в `Membership#can?`. Org admin может добавить permission в любую custom role через Settings → Roles UI.
- `REQ-06` UI `/settings/currency-rates` — две панели: **API rates** (read-only list с датой и источником) и **Manual overrides** (mutable CRUD для membership'ов с permission). i18n ru/en.
- `REQ-07` API key currencyapi.com хранится в per-environment Rails credentials (`credentials/production.yml.enc`, `credentials/development.yml.enc`) под ключом `currencyapi.api_key`. В test-окружении key НЕ требуется: `CurrencyApiClient` стаббится через WebMock. Если key отсутствует в run-time — job логирует warning и `early return` (без exception, без consumption retry budget).
- `REQ-08` Обновить `memory-bank/domain/money-and-currency.md`: снять утверждение «No FX», добавить секцию «Conversion (FT-037)» с ссылкой на сервис и формулу.
- `REQ-09` Dev seed `db/seeds/exchange_rates.rb` создаёт фиктивные API rates на `Date.current` для всех пар из `CurrencyConfig` (используется `seed_data` константа с плейсхолдер-курсами; комментарий — "dev only, production использует FetchExchangeRatesJob"). Подключается через `db/seeds.rb` условно `if Rails.env.development?`.
- `REQ-10` Use case `memory-bank/use-cases/UC-006-daily-fx-fetch.md` документирует устойчивый сценарий «платформа ежедневно тянет курсы, админ org может переопределить».

### Non-Scope

- `NS-01` Real-time / транзакционная FX. Сохранённые `*_cents` никогда не мутируются; курс не фиксируется в момент бронирования.
- `NS-02` Интеграция в reports, dashboards, PDF statements, owner module, reservations, expenses, pricing — отдельные фичи, зависящие от FT-037.
- `NS-03` Per-property / per-unit currency. Ограничение FT-015 (один currency per organization) остаётся.
- `NS-04` Множественные base API rates. Job использует **только** `base=USD` (минимизация API-квоты). Cross-pair derivation — triangulation в runtime (см. DEC-01), результаты не persist'ятся.
- `NS-05` Исторический backfill API rates до `FetchExchangeRatesJob.first_run_date`. Для прошлого — manual override.
- `NS-06` Rotation API key, alerting на quota exceeded, multi-provider fallback — отдельная эксплуатационная задача.
- `NS-07` UI admin'а для просмотра истории rate changes / audit log.
- `NS-08` Фича не добавляет новые gems; HTTP через `Net::HTTP` (stdlib) или `Faraday` если тот уже в `Gemfile.lock`.

### Constraints / Assumptions

- `ASM-01` currencyapi.com free tier ≥ 300 requests/month и поддерживает `base=USD` с комбинированным `currencies=` параметром (подтверждено по docs на 2026-04-24).
- `ASM-02` Precision triangulation через USD (два integer-деления с `rate_x1e10`) укладывается в MET-03 < 1e-7 для всех пар из `CurrencyConfig`.
- `ASM-03` `CurrencyConfig` предоставляет `decimals(code)` как публичный API (подтвердить до implementation; если нет — добавить в change surface).
- `CON-01` ADR-004 invariant: все суммы — integer minor units в своей валюте. Конвертация compute-only, не пишет в исходные `*_cents`.
- `CON-02` Rate storage — integer `rate_x1e10` (= `major_target_per_major_source * 10**10`). Формула с учётом разницы decimals (source=`s`, target=`t`):

  ```text
  numerator   = amount_minor * rate_x1e10 * (10 ** max(t - s, 0))
  denominator = (10 ** 10) * (10 ** max(s - t, 0))
  result_minor = half_even_div(numerator, denominator)   # integer-only
  ```

  где `half_even_div(n, d)`:

  ```text
  q, r = n.divmod(d)
  double_r = 2 * r
  return q if double_r < d
  return q + 1 if double_r > d
  q.even? ? q : q + 1                # banker's rounding on exact .5
  ```

  Всё integer — соблюдает ADR-004.
- `CON-03` Multi-tenant: `organization_id IS NULL` → global API rate (shared resource, visible всем); `organization_id = X` → manual override только для org X. Два scope'а:
  - **Read scope** (`ExchangeRatePolicy::Scope#resolve`): `global OR own-org` — глобальные API rates видны для reference, manual overrides — только свои.
  - **Mutate scope** (`ExchangeRatePolicy#update?/destroy?`): дополнительно требует `record.organization_id == Current.organization.id && record.source == 'manual'`.
  - Чужой `organization_id` → row не в read scope → `find!` → 404 (PCON-01).
  - NULL (`organization_id IS NULL`) API row → видна в read scope, но policy denies mutation → 403.
- `CON-04` `memory-bank/domain/money-and-currency.md` требует обновления (`REQ-08`). Секция «No FX» снимается.
- `CON-05` Новые gems не добавляются (NS-08); если всё же потребуются (HTTP с ретраями, VCR для test) — escalation через autonomy-boundaries.
- `CON-06` API rates (`organization_id IS NULL`) immutable через публичный REST: только `FetchExchangeRatesJob` может их писать. Enforce на двух уровнях:
  - **Authorization**: `ExchangeRatePolicy#update?/destroy?` denies для NULL rows (403) — см. CON-03.
  - **Database-level invariant**: CHECK constraint `source = 'manual' OR source = 'api'` (уже покрыт enum); миграция добавляет `CHECK ((source = 'api' AND organization_id IS NULL) OR (source = 'manual' AND organization_id IS NOT NULL))` — запрещает миксинг на уровне БД. Job пишет через `ExchangeRate.insert_all` минуя `valid?`/policy (DEC-04 объясняет почему это безопасно и чище, чем thread-local флаги).
- `DEC-01` Triangulation для non-USD пар: **runtime triangulation через USD без сохранения производного rate**. Резоны: минимизация API квоты (1 request/day), прозрачность provenance (нет «derived» rows). Trade-off: два integer-деления на triangulated call → precision loss оценена в ASM-02. Альтернатива (fetch всех пар как base) отвергнута из-за paid API.
- `DEC-02` Precision `rate_x1e10` (не `x1e6`): 10 знаков покрывают MET-03 для пар с разницей масштаба ×1e5 (USD↔UZS, USD↔IDR). BIGINT ёмкости хватает (`max rate ≈ 9.2e8` → гиперинфляционные сценарии).
- `DEC-03` Расписание `every day at 00:30 UTC` (human-readable формат `config/recurring.yml` через fugit; семантически эквивалентно cron `'30 0 * * *'`). 30-минутный запас после UTC midnight update у currencyapi.com (по их docs daily rates обновляются в 00:00 UTC). Human-readable выбран для консистентности с существующими записями в recurring.yml.
- `DEC-04` Enforcement CON-06 через DB CHECK constraint + Pundit policy, **без** thread-local `Current.api_context`. Резоны: (1) Solid Queue worker'ы держат threads в pool; raise в job может оставить thread-local set, следующая job получит false-positive bypass; (2) `ActiveSupport::CurrentAttributes` автоматически reset'ится между Rack requests, но не между jobs — нужен ручной `around_perform` hook с `ensure`, легко забыть в будущих jobs. Альтернатива (DB constraint) — декларативна, независима от application state, работает при прямых SQL-миграциях, не требует cleanup. Job делает `insert_all(..., on_duplicate: :update)` напрямую на таблицу; CHECK constraint + partial unique index + controller-level Pundit guard дают defense-in-depth.

## How

### Solution

Одна таблица `exchange_rates` хранит глобальные API rates (`organization_id IS NULL`, заполняются job'ом) и per-org manual overrides (`organization_id NOT NULL`, CRUD через UI). Unique index `(base, quote, effective_date, source, organization_id)` гарантирует идемпотентность upsert'а и многотенантность. Сервис `CurrencyConverter` принимает `organization` и выбирает эффективный rate с приоритетом manual > api и fallback по дате `<= at`. Для non-USD пар триангулирует через USD в runtime без persist. Trade-off: одна таблица с большинством NULL organization_id'ов — компенсируется partial index `WHERE organization_id IS NULL`. Paid API → ровно 1 request/day, triangulation вместо multi-base fetch.

### Change Surface

| Surface | Type | Why it changes |
| --- | --- | --- |
| `backend/db/migrate/NNN_create_exchange_rates.rb` | code | Таблица + unique index + partial index |
| `backend/app/models/exchange_rate.rb` | code | Модель, enum source, scopes (`global`, `for_organization`, `effective_on`), validations |
| `backend/app/services/currency_converter.rb` | code | Pure service, `convert`, `RateNotFound`, triangulation, half_even_div |
| `backend/app/services/currency_api_client.rb` | code | HTTP boundary к currencyapi.com |
| `backend/app/jobs/fetch_exchange_rates_job.rb` | code | Daily recurring job, idempotent upsert |
| `backend/config/recurring.yml` | config | Cron `'30 0 * * *'` |
| `backend/config/credentials/development.yml.enc` | config | dev key (optional) |
| `backend/config/credentials/production.yml.enc` | config | prod key |
| `backend/app/controllers/api/v1/exchange_rates_controller.rb` | code | REST endpoints |
| `backend/app/policies/exchange_rate_policy.rb` | code | Pundit: permission `currency_rates.manage`, global rows immutable |
| `backend/app/models/concerns/permissions.rb` | code | Add `currency_rates.manage` to `ALL_PERMISSIONS` |
| `backend/db/seeds/preset_roles.rb` (или grounded path) | data | Включить `currency_rates.manage` в `admin` preset |
| `memory-bank/adr/ADR-016-db-check-enforces-exchange-rate-invariant.md` | doc | DEC-04: CHECK-constraint вместо thread-local как canonical pattern для job-only writes |
| `backend/config/routes.rb` | config | `resources :exchange_rates, only: [:index, :create, :update, :destroy]` под `api/v1` |
| `backend/db/seeds/exchange_rates.rb` | data | Dev seed |
| `backend/db/seeds.rb` | data | `load 'db/seeds/exchange_rates.rb' if Rails.env.development?` |
| `backend/spec/factories/exchange_rates.rb` | code | FactoryBot |
| `backend/spec/services/currency_converter_spec.rb` | code | CHK-01 |
| `backend/spec/services/currency_api_client_spec.rb` | code | CHK-02 |
| `backend/spec/jobs/fetch_exchange_rates_job_spec.rb` | code | CHK-02 |
| `backend/spec/models/exchange_rate_spec.rb` | code | CHK-04 |
| `backend/spec/requests/api/v1/exchange_rates_spec.rb` | code | CHK-03 |
| `backend/spec/policies/exchange_rate_policy_spec.rb` | code | CHK-03 |
| `backend/spec/support/currency_api_stub.rb` | code | WebMock helper для CurrencyApiClient |
| `frontend/src/api/exchangeRates.js` | code | axios client |
| `frontend/src/stores/exchangeRates.js` | code | Pinia store |
| `frontend/src/views/settings/CurrencyRatesView.vue` | code | UI двух панелей |
| `frontend/src/router/index.js` | config | Route `/settings/currency-rates` |
| `frontend/src/locales/ru.json` | data | i18n keys |
| `frontend/src/locales/en.json` | data | i18n keys |
| `frontend/src/__tests__/stores/exchangeRates.test.js` | code | CHK-05 |
| `frontend/src/__tests__/views/settings/CurrencyRatesView.test.js` | code | CHK-05 |
| `memory-bank/domain/money-and-currency.md` | doc | REQ-08: секция Conversion + снятие «No FX» |
| `memory-bank/domain/schema.md` | doc | Добавить `ExchangeRate` |
| `memory-bank/domain/api-reference.md` | doc | Endpoints `/api/v1/exchange_rates` |
| `memory-bank/domain/permissions.md` | doc | `currency_rates.manage` |
| `memory-bank/use-cases/UC-006-daily-fx-fetch.md` | doc | REQ-10 |

### Flow

1. **Daily fetch.** Solid Queue запускает `FetchExchangeRatesJob` по cron `'30 0 * * *'` UTC. Job проверяет `credentials.dig(:currencyapi, :api_key)`; если nil → warning log, early return. Иначе вызывает `CurrencyApiClient.latest(base: 'USD', currencies: CurrencyConfig.codes - ['USD'])` → один HTTP GET. Парсит JSON, готовит массив rows `{base_currency: 'USD', quote_currency: X, rate_x1e10: ..., effective_date: Date.current, source: 'api', organization_id: nil}`. Выполняет `ExchangeRate.insert_all(rows, unique_by: [:base_currency, :quote_currency, :effective_date, :source, :organization_id], on_duplicate: :update)`. DB CHECK constraint (DEC-04) гарантирует, что этим путём нельзя случайно записать `source=manual` или `source=api + organization_id != NULL`.
2. **Manual override.** Membership с permission `currency_rates.manage` открывает `/settings/currency-rates`, видит две панели. Создаёт manual row через POST `/api/v1/exchange_rates` с `{base, quote, rate_x1e10, effective_date, note}`. Controller: `authorize ExchangeRate`, `Current.organization.exchange_rates.create!(params.merge(source: :manual))`.
3. **Conversion (консюмер из будущих фич).** Вызывает `CurrencyConverter.convert(amount_cents: ..., from: 'RUB', to: 'EUR', at: Date.current, organization: Current.organization)`. Сервис:
   - `from == to` → return `amount_cents` (без DB hit).
   - `from == 'USD' || to == 'USD'` → direct lookup: `manual-for-org` → `api-global`, берём row с max effective_date ≤ at → применяем CON-02 формулу.
   - Иначе (non-USD пара) → triangulation: `usd_to_from = rate(USD, from, at, org)`; `usd_to_to = rate(USD, to, at, org)`. `result = convert(amount, from, 'USD', at, org)` затем `convert(..., 'USD', to, at, org)`. Inverse direction (`X → USD`) — свой lookup: если прямой row `base=X, quote=USD` отсутствует, берём inverse через `base=USD, quote=X` с формулой `rate_x1e10_inverse = 10**20 / rate_x1e10` (integer-floor — достаточно при `rate_x1e10`).
   - Rate не найден на любом из шагов → `raise RateNotFound.new(from:, to:, at:, organization_id:)`.

### Contracts

| Contract ID | Input / Output | Producer / Consumer | Notes |
| --- | --- | --- | --- |
| `CTR-01` | HTTP GET `api.currencyapi.com/v3/latest?base_currency=USD&currencies=RUB,EUR,...` → JSON `{data: {RUB: {value: 95.50}, ...}}` | Producer: currencyapi.com; Consumer: CurrencyApiClient | Версия API — v3. Parser устойчив к отсутствующим ключам (FM-03). |
| `CTR-02` | `CurrencyConverter.convert(amount_cents:, from:, to:, at:, organization:) -> Integer` | Producer: this feature; Consumer: будущие фичи (reports/owner/pdf) | SemVer — изменения сигнатуры требуют major bump и миграции консюмеров. `RateNotFound` — checked exception по соглашению. |
| `CTR-03` | `GET /api/v1/exchange_rates` → `{api_rates: [...], manual_overrides: [...]}` | Producer: this feature; Consumer: `CurrencyRatesView.vue` | Две секции в одном response — избегаем N+1 round-trip. Pundit scope применён. |
| `CTR-04` | `POST /api/v1/exchange_rates` body `{base_currency, quote_currency, rate_x1e10, effective_date, note?}` → 201 + JSON row | Producer: UI; Consumer: controller | `source` forced to `manual`, `organization_id` forced to `Current.organization.id`. |

### Failure Modes

- `FM-01` currencyapi.com down / 5xx / timeout → Solid Queue retry policy (3 attempts, exponential backoff 1m/5m/25m). После исчерпания — job failure в Solid Queue dashboard, existing rates не затрагиваются. Консюмеры работают по предыдущему last-known rate через `effective_date <= at` fallback.
- `FM-02` 401 invalid key → job fail-fast (no retry), error log `CurrencyApiClient::Unauthorized`, placeholder для future alert.
- `FM-03` Partial API response (валюта из `CurrencyConfig` отсутствует в data) → upsert тех, что пришли; отсутствующие логируются warning, job success. `FetchExchangeRatesJob::PartialResponse` event для future monitoring.
- `FM-04` `CurrencyConverter` не находит rate (direct + triangulation обе проваливаются) → `raise RateNotFound.new(from:, to:, at:, organization_id:)`. Консюмер решает, как рендерить (fallback на raw amount без конвертации, "—" и т.д.) — не часть этой фичи.
- `FM-05` Concurrent `FetchExchangeRatesJob` runs → unique index гарантирует no duplicates, `insert_all ... on_duplicate: :update` идемпотентен. Advisory lock не нужен.
- `FM-06` Manual override с `rate_x1e10 <= 0` → model validation `validates :rate_x1e10, numericality: { greater_than: 0 }` → 422.
- `FM-07` Manual override с currency не из `CurrencyConfig.codes` → `validates :base_currency, :quote_currency, inclusion: { in: CurrencyConfig.codes }` → 422.
- `FM-08` Manual override с `base == quote` → `validate :base_differs_from_quote` → 422.
- `FM-09` `effective_date` в будущем > Date.current + 7 days → warning, но допускается (use case: админ знает плановый курс на завтра). Через 30 days — 422.
- `FM-10` credentials.currencyapi.api_key отсутствует → job warning + early return (REQ-07). Consumer продолжает работать по существующим rates.
- `FM-11` Попытка мутировать global row (`organization_id IS NULL`) через API → Pundit 403 + CON-06 model-level guard.
- `FM-12` Concurrent request создания двух manual overrides для одной `(base, quote, date, org)` пары → unique constraint → 422 с сообщением i18n.

### ADR Dependencies

| ADR | Current `decision_status` | Used for | Execution rule |
| --- | --- | --- | --- |
| [../../adr/ADR-004-integer-cents-for-money.md](../../adr/ADR-004-integer-cents-for-money.md) | `accepted` | Integer-only arithmetic для CON-02 | Canonical input — все формулы integer, никаких Float/BigDecimal |
| [../../adr/ADR-012-class-level-authorize-nested-controllers.md](../../adr/ADR-012-class-level-authorize-nested-controllers.md) | `accepted` | ExchangeRatePolicy pattern + Scope#resolve | Canonical input — policy class + Scope#resolve для multi-tenant (read scope = global ∪ own-org; mutate scope = own-org manual only) |
| [../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md](../../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md) | `accepted` | DEC-04: DB CHECK constraint для job-only writes | Canonical input — pattern применён в миграции + подтверждён через NEG-11 spec. |

## Verify

### Exit Criteria

- `EC-01` `CurrencyConverter.convert` возвращает корректные integer minor units с приоритетом `manual-for-org > api-global`, fallback по `effective_date <= at`, same-currency short-circuit без DB hit, triangulation для non-USD пар.
- `EC-02` `FetchExchangeRatesJob` идемпотентен (повторный запуск в тот же день — 0 новых rows) и делает ровно 1 HTTP-запрос к currencyapi.com за запуск.
- `EC-03` UI `/settings/currency-rates` показывает две панели; membership с permission `currency_rates.manage` создаёт/обновляет/удаляет manual override; без permission — 403 на мутирующие endpoints.
- `EC-04` Multi-tenant isolation: manual override org A не попадает в lookup и read scope org B; попытка org A мутировать row org B → 404 (Pundit resolve scope).
- `EC-05` Попытка мутировать API row (`organization_id IS NULL`) через API → 403 (RequirePermission / CON-06 guard).
- `EC-06` `domain/money-and-currency.md` обновлён: секция «Conversion (FT-037)» присутствует, утверждение «No FX» снято.

### Traceability matrix

| Requirement ID | Design refs | Acceptance refs | Checks | Evidence IDs |
| --- | --- | --- | --- | --- |
| `REQ-01` | `CON-01`, `CON-02`, `CON-03`, `DEC-02` | `EC-01`, `EC-04`, `SC-01`, `SC-02`, `SC-03` | `CHK-01`, `CHK-04` | `EVID-01`, `EVID-04` |
| `REQ-02` | `CON-05`, `DEC-03`, `DEC-04`, `FM-01`, `FM-02`, `FM-03`, `FM-05` | `EC-02`, `SC-04`, `NEG-09`, `NEG-10` | `CHK-02` | `EVID-02` |
| `REQ-03` | `CON-01`, `CON-02`, `CON-03`, `DEC-01`, `FM-04` | `EC-01`, `EC-04`, `SC-01`, `SC-02`, `SC-03`, `NEG-01`, `NEG-02` | `CHK-01` | `EVID-01` |
| `REQ-04` | `CON-03`, `CON-06`, `DEC-04`, `CTR-03`, `CTR-04`, `FM-11`, `FM-12` | `EC-03`, `EC-04`, `EC-05`, `SC-05`, `NEG-03`, `NEG-04`, `NEG-05`, `NEG-06`, `NEG-07`, `NEG-08`, `NEG-11` | `CHK-03`, `CHK-04` | `EVID-03`, `EVID-04` |
| `REQ-05` | — | `EC-03`, `NEG-03` | `CHK-03` | `EVID-03` |
| `REQ-06` | `CTR-03`, `CTR-04` | `EC-03` | `CHK-05` | `EVID-05` |
| `REQ-07` | `FM-02`, `FM-10` | `EC-02`, `SC-06` | `CHK-02` | `EVID-02` |
| `REQ-08` | `CON-04` | `EC-06` | `CHK-06` | `EVID-06` |
| `REQ-09` | — | `EC-02` | `CHK-02` | `EVID-02` |
| `REQ-10` | — | `EC-06` | `CHK-06` | `EVID-06` |

### Acceptance Scenarios

- `SC-01` **Same-decimal pair + manual-over-api priority.** Given API rate USD→RUB=95.50 (`rate_x1e10=955_000_000_000`) и manual override USD→RUB=100.00 (`rate_x1e10=1_000_000_000_000`) на 2026-04-20 для org A. When `CurrencyConverter.convert(amount_cents: 10_000, from: 'USD', to: 'RUB', at: Date.new(2026,4,20), organization: org_a)`. Then результат = `(10_000 * 1_000_000_000_000) / 10**10 = 1_000_000` minor units (10 000.00 RUB). Для org B без override — `(10_000 * 955_000_000_000) / 10**10 = 955_000` minor units (9 550.00 RUB).
- `SC-02` **Cross-decimal pair (USD→UZS, decimals 2→0).** Given API rate USD→UZS=12_700 (`rate_x1e10=127_000_000_000_000`). When `CurrencyConverter.convert(amount_cents: 10_000, from: 'USD', to: 'UZS', at:, organization:)`. Then формула: `num = 10_000 * 127_000_000_000_000 * 10**0 = 1.27e18`, `den = 10**10 * 10**2 = 10**12`, `result = half_even_div(num, den) = 1_270_000` minor units UZS = 1 270 000 UZS (100 USD × 12 700 UZS/USD). Round-trip UZS→USD returns `≈ 10_000 ± 1` cent (MET-03 check).
- `SC-03` **Triangulation non-USD pair.** Given API rates USD→RUB=95.50, USD→EUR=0.92 на одну дату. When `CurrencyConverter.convert(amount_cents: 100_00, from: 'RUB', to: 'EUR', at:, organization:)`. Then сервис делает `convert(100_00, 'RUB', 'USD', at)` (inverse lookup через USD→RUB) затем `convert(result, 'USD', 'EUR', at)`. Expected ≈ 0.96 EUR = 96 minor units ± 1 (precision bound).
- `SC-04` **Job idempotency + HTTP request count.** Given `FetchExchangeRatesJob` запущен первый раз: WebMock зафиксировал 1 GET к currencyapi.com, 10 rows созданы (USD→X для 10 валют). When job запущен повторно в тот же день. Then WebMock зафиксировал 2-й GET (job свежие данные берёт всегда), 0 новых rows, 10 rows обновлены (upsert). MET-02 check: 2 requests / 2 runs.
- `SC-05` **End-to-end manual override через API.** Given membership org A с permission `currency_rates.manage`. When POST `/api/v1/exchange_rates` body `{base_currency: 'USD', quote_currency: 'RUB', rate_x1e10: 1_000_000_000_000, effective_date: '2026-04-20'}`. Then 201; последующий `CurrencyConverter.convert(USD, RUB, at: 2026-04-20, organization: org_a)` возвращает результат по manual rate. Для org B тот же вызов — по API rate.
- `SC-06` **API key missing graceful degradation.** Given `Rails.application.credentials.currencyapi` = nil. When `FetchExchangeRatesJob.perform_now`. Then warning log записан, 0 HTTP-запросов сделано, 0 rows созданы, job возвращает success (не raise).

### Negative / edge scenarios

- `NEG-01` `CurrencyConverter.convert(USD, RUB, at:, organization:)` с пустым БД → `raise RateNotFound` с payload.
- `NEG-02` `CurrencyConverter.convert(RUB, EUR, at:, organization:)` где есть только USD→RUB, но нет USD→EUR → `RateNotFound` (triangulation не смогла).
- `NEG-03` POST `/api/v1/exchange_rates` от membership без permission `currency_rates.manage` → 403.
- `NEG-04` `PATCH /api/v1/exchange_rates/:id` где `:id` принадлежит org B, из контекста org A → 404 (Pundit resolve scope).
- `NEG-05` POST с `rate_x1e10: 0` или `rate_x1e10: -1` → 422 с i18n error.
- `NEG-06` POST с `base_currency: 'XYZ'` (не в CurrencyConfig) → 422.
- `NEG-07` Два concurrent POST с одинаковыми `(base, quote, effective_date, source=manual, organization_id)` → первый 201, второй 422 (unique constraint → rescued в controller).
- `NEG-08` `PATCH /api/v1/exchange_rates/:id` где `:id` — API row (`organization_id IS NULL`) → 403 (policy denies — row в read scope но `update?` false per CON-03).
- `NEG-09` `CurrencyApiClient` получает 401 от currencyapi.com → `raise CurrencyApiClient::Unauthorized`; `FetchExchangeRatesJob` ловит, логирует error, НЕ retry'ит (fail-fast per FM-02), 0 upsert'ов.
- `NEG-10` API response не содержит часть запрошенных currencies (partial, FM-03) → job upsert'ит только пришедшие, warning log для отсутствующих, job success (не raise).
- `NEG-11` Прямая SQL-миграция / raw `ExchangeRate.new(source: 'api', organization_id: <non-null>)` → DB CHECK constraint отклоняет (`PG::CheckViolation`). Покрывает DEC-04 DB-level invariant.

### Checks

| Check ID | Covers | How to check | Expected result | Evidence path |
| --- | --- | --- | --- | --- |
| `CHK-01` | `EC-01`, `SC-01`, `SC-02`, `SC-03`, `NEG-01`, `NEG-02` | `cd backend && bundle exec rspec spec/services/currency_converter_spec.rb` | Все примеры зелёные; round-trip precision MET-03 подтверждён | `artifacts/ft-037/verify/chk-01/` |
| `CHK-02` | `EC-02`, `SC-04`, `SC-06`, `NEG-09`, `NEG-10` | `cd backend && bundle exec rspec spec/services/currency_api_client_spec.rb spec/jobs/fetch_exchange_rates_job_spec.rb` | Все зелёные; WebMock подтверждает ровно 1 HTTP-запрос за запуск job; 401 и partial response обработаны | `artifacts/ft-037/verify/chk-02/` |
| `CHK-03` | `EC-03`, `EC-04`, `EC-05`, `SC-05`, `NEG-03`, `NEG-04`, `NEG-05`, `NEG-06`, `NEG-07`, `NEG-08` | `cd backend && bundle exec rspec spec/requests/api/v1/exchange_rates_spec.rb spec/policies/exchange_rate_policy_spec.rb` | Все зелёные; multi-tenant scope доказан; 403 для NULL row + 404 для чужой org разделены | `artifacts/ft-037/verify/chk-03/` |
| `CHK-04` | `EC-01` (model-level), FM-06, FM-07, FM-08, FM-09, `NEG-11` | `cd backend && bundle exec rspec spec/models/exchange_rate_spec.rb` | Все зелёные; validations + DB CHECK constraint (DEC-04) покрыты | `artifacts/ft-037/verify/chk-04/` |
| `CHK-05` | `EC-03` (frontend) | `cd frontend && yarn test src/__tests__/stores/exchangeRates.test.js src/__tests__/views/settings/CurrencyRatesView.test.js` | Все зелёные; две панели рендерятся, mutation hooks вызываются | `artifacts/ft-037/verify/chk-05/` |
| `CHK-06` | `EC-06` | `grep -q "Conversion (FT-037)" memory-bank/domain/money-and-currency.md && ! grep -q "No FX / No Multi-Currency" memory-bank/domain/money-and-currency.md && test -f memory-bank/use-cases/UC-006-daily-fx-fetch.md` | exit 0 | `artifacts/ft-037/verify/chk-06/` |

### Test matrix

| Check ID | Evidence IDs | Evidence path |
| --- | --- | --- |
| `CHK-01` | `EVID-01` | `artifacts/ft-037/verify/chk-01/` |
| `CHK-02` | `EVID-02` | `artifacts/ft-037/verify/chk-02/` |
| `CHK-03` | `EVID-03` | `artifacts/ft-037/verify/chk-03/` |
| `CHK-04` | `EVID-04` | `artifacts/ft-037/verify/chk-04/` |
| `CHK-05` | `EVID-05` | `artifacts/ft-037/verify/chk-05/` |
| `CHK-06` | `EVID-06` | `artifacts/ft-037/verify/chk-06/` |

### Evidence

- `EVID-01` rspec output `currency_converter_spec.rb` с покрытием SC-01..SC-03, NEG-01..NEG-02, MET-03 round-trip.
- `EVID-02` rspec output `currency_api_client_spec.rb` + `fetch_exchange_rates_job_spec.rb` + WebMock request count log.
- `EVID-03` rspec output `requests/api/v1/exchange_rates_spec.rb` + `policies/exchange_rate_policy_spec.rb`.
- `EVID-04` rspec output `exchange_rate_spec.rb`.
- `EVID-05` vitest output обоих frontend spec'ов.
- `EVID-06` diff `money-and-currency.md` + presence of `UC-006-daily-fx-fetch.md` + `doc-validate` log.

### Evidence contract

| Evidence ID | Artifact | Producer | Path contract | Reused by checks |
| --- | --- | --- | --- | --- |
| `EVID-01` | rspec output (service) | verify-runner | `artifacts/ft-037/verify/chk-01/` | `CHK-01` |
| `EVID-02` | rspec output (client + job) + WebMock request log | verify-runner | `artifacts/ft-037/verify/chk-02/` | `CHK-02` |
| `EVID-03` | rspec output (request + policy) | verify-runner | `artifacts/ft-037/verify/chk-03/` | `CHK-03` |
| `EVID-04` | rspec output (model) | verify-runner | `artifacts/ft-037/verify/chk-04/` | `CHK-04` |
| `EVID-05` | vitest output (frontend) | verify-runner | `artifacts/ft-037/verify/chk-05/` | `CHK-05` |
| `EVID-06` | diff + doc-validate log | verify-runner | `artifacts/ft-037/verify/chk-06/` | `CHK-06` |
