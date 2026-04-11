---
title: "UC-003: Owner Payout Cycle"
doc_kind: use_case
doc_function: canonical
purpose: "Monthly owner statement: revenue → commission → expenses → net payout → PDF."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
---

# UC-003: Owner Payout Cycle

## Goal

Менеджер формирует ежемесячный отчёт для собственника с расчётом выручки, комиссии, расходов и суммы к выплате.

## Primary Actor

Менеджер УК (роль: owner или member с finances.view).

## Trigger

Менеджер открывает `/owners/:id/statement` в конце отчётного периода.

## Preconditions

- Собственник создан с commission_rate (basis points, e.g. 1500 = 15%).
- Объекты собственника привязаны через Property.owner_id.
- Бронирования и расходы за период существуют.

## Main Flow

1. Менеджер открывает список собственников → нажимает «Отчёт».
2. Система вызывает `GET /api/v1/owners/:id/statement?from=&to=`.
3. Бэкенд рассчитывает:
   - `total_revenue` = сумма total_price_cents бронирований на объектах собственника (confirmed + checked_in + checked_out).
   - `commission` = total_revenue × commission_rate / 10000.
   - `total_expenses` = сумма amount_cents расходов на объектах собственника.
   - `net_payout` = total_revenue − commission − total_expenses.
4. Система отображает 4 KPI-карточки: Выручка, Комиссия, Расходы, К выплате.
5. Таблица «По объектам» показывает breakdown per property.
6. Менеджер нажимает «PDF» → `GET /owners/:id/statement?format=pdf`.
7. Prawn генерирует PDF (Pdf::OwnerStatementPdf) с Arial TTF → скачивается.

## Alternate Flows / Exceptions

- `ALT-01` Собственник без объектов → все метрики = 0.
- `ALT-02` Cancelled бронирования исключены из revenue.
- `ALT-03` Невалидные даты from/to → дефолт на текущий месяц.
- `EX-01` PDF rendering error (font) → 500 (fixed: Arial TTF bundled).

## Postconditions

- **Success:** Менеджер получил PDF с корректными расчётами для передачи собственнику.
- Net payout card цвет: зелёный если ≥ 0, красный если < 0.

## Business Rules

- `BR-01` commission_rate в basis points: 1500 = 15.0%. Отображается как процент.
- `BR-02` net_payout может быть отрицательным (расходы > доход − комиссия).
- `BR-03` Только active reservation statuses учитываются в revenue.
- `BR-04` Расходы привязаны к property_id, не к owner_id (через join).

## Traceability

| Upstream / Downstream | References |
|---|---|
| Features | FT-007, FT-012, FT-017 |
| E2E | `e2e/owners.spec.js` |
