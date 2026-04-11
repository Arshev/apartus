---
title: "UC-001: Reservation Lifecycle"
doc_kind: use_case
doc_function: canonical
purpose: "End-to-end reservation flow: create → price calc → check-in → notifications → check-out → analytics."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
---

# UC-001: Reservation Lifecycle

## Goal

Менеджер создаёт бронирование, система автоматически рассчитывает цену, отправляет уведомления гостю и в Telegram, проводит check-in и check-out, обновляет dashboard и отчёты.

## Primary Actor

Менеджер УК / частный арендодатель (роль: owner или member с reservations.manage).

## Trigger

Менеджер открывает `/reservations/new` или гость бронирует через виджет (UC-002).

## Preconditions

- Организация создана, юниты добавлены с base_price_cents > 0.
- Пользователь аутентифицирован с permission `reservations.manage`.
- Гость существует в CRM (или создаётся при бронировании).

## Main Flow

1. Менеджер выбирает юнит, даты заезда/выезда, гостя.
2. Система авторассчитывает цену: `PriceCalculator.call(unit, check_in, check_out)`.
   - Базовая цена × ночи, с учётом SeasonalPrice и PricingRules (FT-003, FT-013).
3. Менеджер подтверждает — бронирование создаётся со статусом `confirmed`.
4. `NotificationSender.send_booking_confirmation` отправляет email гостю (FT-009).
5. `TelegramNotifier.notify_booking` отправляет уведомление в чат (FT-016).
6. Бронирование отображается в календаре (FT-006), списке (FT-002), dashboard upcoming (FT-005).
7. В день заезда менеджер нажимает **Check-in** → статус `checked_in`.
   - `NotificationSender.send_check_in_reminder` → email.
   - `TelegramNotifier.notify_status_change` → Telegram.
8. В день выезда менеджер нажимает **Check-out** → статус `checked_out`.
   - `NotificationSender.send_check_out_thank_you` → email.
   - Dashboard occupancy обновляется.
9. Revenue учитывается в Reports (FT-007) и Owner Statement (FT-012).

## Alternate Flows / Exceptions

- `ALT-01` Менеджер отменяет бронирование → статус `cancelled`, revenue исключён из отчётов.
- `ALT-02` Бронирование без гостя (date block) → нет email-уведомлений, Telegram получает "Блокировка".
- `ALT-03` Пересечение дат → model validation + DB exclusion constraint → 422.
- `EX-01` SMTP-ошибка при отправке email → NotificationSender создаёт log, не блокирует flow.
- `EX-02` Telegram не настроен → skip silently.

## Postconditions

- **Success:** Бронирование в статусе `checked_out`, revenue учтён в финансах, гость получил 3 email.
- **Cancel:** Бронирование в `cancelled`, не влияет на revenue/occupancy.

## Business Rules

- `BR-01` Статус-машина: confirmed → checked_in → checked_out. Cancel допустим из confirmed и checked_in.
- `BR-02` Overlapping reservations на один юнит запрещены (model + DB constraint).
- `BR-03` Цена 0 = авторасчёт; ненулевая = ручная, сохраняется как есть.
- `BR-04` Check-in невозможен из checked_out/cancelled. Check-out невозможен из confirmed.

## Traceability

| Upstream / Downstream | References |
|---|---|
| Features | FT-002, FT-003, FT-005, FT-006, FT-007, FT-009, FT-012, FT-013, FT-016 |
| ADR | ADR-004 (money as cents) |
| E2E | `e2e/reservations.spec.js`, `e2e/calendar.spec.js`, `e2e/dashboard.spec.js` |
