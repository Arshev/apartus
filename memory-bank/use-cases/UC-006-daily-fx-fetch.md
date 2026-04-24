---
title: "UC-006: Daily FX Fetch & Manual Overrides"
doc_kind: use_case
doc_function: canonical
purpose: "Платформа ежедневно подтягивает курсы валют с currencyapi.com; админ организации может переопределить их для своей учётной единицы."
derived_from:
  - ../domain/problem.md
  - ../domain/money-and-currency.md
  - ../features/FT-037-multi-currency-conversion/feature.md
status: active
audience: humans_and_agents
---

# UC-006: Daily FX Fetch & Manual Overrides

## Goal

Обеспечить актуальные валютные курсы для будущих кросс-валютных отчётов и owner statements. Одновременно дать админу организации возможность заменить автоматические курсы на внутренние (например курс ЦБ, договорной rate с владельцем).

## Primary Actors

- **Система (Solid Queue)** — автоматический daily fetch.
- **Admin организации** — membership с permission `currency_rates.manage` или `role_enum: :owner`.

## Trigger

- **Auto:** cron `every day at 00:30 UTC` из `config/recurring.yml`.
- **Manual:** admin открывает `/settings/currency-rates` и добавляет override.

## Preconditions

- **Для auto-fetch:** `credentials.currencyapi.api_key` настроен в production env (см. FT-037 REQ-07). Если ключ отсутствует — job логирует warning и делает early-return.
- **Для manual:** admin имеет permission `currency_rates.manage` (входит в preset `admin`; `role_enum: :owner` bypass).

## Main Flow

### Auto-fetch (ежедневно)

1. Solid Queue dispatch'ит `FetchExchangeRatesJob` в 00:30 UTC.
2. Job читает `credentials.currencyapi.api_key`.
3. `CurrencyApiClient.latest(base: 'USD', currencies: CurrencyConfig.codes - ['USD'], api_key:)` — **один** GET к `api.currencyapi.com/v3/latest`.
4. Парсит JSON, готовит 10 rows (10 non-USD валют CurrencyConfig).
5. `ExchangeRate.upsert_all(rows, unique_by: :idx_exchange_rates_unique_global, update_only: [:rate_x1e10])` — идемпотентный upsert, update только rate при collision.
6. DB CHECK constraint (ADR-016) дополнительно защищает инвариант `source=api ⇔ organization_id IS NULL`.

### Manual override

1. Admin переходит на `/settings/currency-rates`.
2. UI вызывает `GET /api/v1/exchange_rates` → два списка: API rates (read-only) + manual overrides (mutable) — Pundit Scope фильтрует по `global OR own-org`.
3. Admin нажимает "Добавить переопределение", заполняет форму `(base, quote, rate, effective_date, note)`.
4. `POST /api/v1/exchange_rates` с `source: manual` (принудительно в controller), `organization_id: Current.organization.id`.
5. Pundit `ExchangeRatePolicy#create?` проверяет `currency_rates.manage`; model validations — не-ноль rate, inclusion в CurrencyConfig, unique за пару; DB CHECK — source/org консистентность.
6. Следующий вызов `CurrencyConverter.convert(..., organization: Current.organization)` берёт manual rate приоритетнее API.

## Alternate / Error Flows

- **currencyapi.com 401:** job fail-fast, без retry. Админ получает error в логах (будущая интеграция с alert).
- **currencyapi.com 5xx / timeout:** ActiveJob `retry_on` — 3 попытки с exponential backoff.
- **Partial API response** (нет часть валют): upsert пришедших, warning log для отсутствующих, job success.
- **API key missing:** early-return без HTTP-запроса (SC-06 в FT-037).
- **Попытка мутировать API row через UI:** `ExchangeRatePolicy#update?` отказывает (403) или controller lookup не находит (404, так как scope = own-org).
- **Duplicate manual override:** unique partial index `idx_exchange_rates_unique_per_org` → 422 с i18n error message.

## Postconditions

- Таблица `exchange_rates` содержит актуальные rows на `Date.current`.
- `CurrencyConverter.convert` может обслуживать pairs из CurrencyConfig (direct + inverse + triangulation без persist).
- API квота currencyapi.com — ≤ 1 request/day (MET-02).

## Features involved

- **FT-037** — вся инфраструктура (модель, job, сервис, policy, UI).
- **FT-015** — per-org валюта (consumer в будущем).
- Будущие фичи — reports / owner statements / dashboard в не-базовой валюте — будут консюмерами `CurrencyConverter`.

## References

- [FT-037 feature.md](../features/FT-037-multi-currency-conversion/feature.md)
- [ADR-016: DB CHECK constraint](../adr/ADR-016-db-check-enforces-exchange-rate-invariant.md)
- [ADR-004: Integer cents](../adr/ADR-004-integer-cents-for-money.md)
- [Money & Currency conventions](../domain/money-and-currency.md)
