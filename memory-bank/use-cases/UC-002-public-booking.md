---
title: "UC-002: Public Booking"
doc_kind: use_case
doc_function: canonical
purpose: "Guest books a unit through the public widget without authentication."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
---

# UC-002: Public Booking

## Goal

Гость находит доступный юнит на сайте арендодателя, бронирует его и получает подтверждение на email.

## Primary Actor

Гость (неаутентифицированный пользователь).

## Trigger

Гость открывает `/widget/:slug` — встроенный виджет бронирования.

## Preconditions

- Организация существует с заполненным slug.
- Юниты имеют base_price_cents > 0.
- Даты заезда/выезда в будущем.

## Main Flow

1. Гость вводит даты заезда и выезда, нажимает «Найти».
2. Система вызывает `GET /api/v1/public/properties/:slug/availability?from=&to=`.
3. Система возвращает список доступных юнитов с рассчитанной ценой (PriceCalculator).
4. Гость выбирает юнит, нажимает «Забронировать».
5. Открывается диалог: имя, email, телефон гостя.
6. Гость заполняет данные и нажимает «Подтвердить».
7. `POST /api/v1/public/properties/:slug/bookings` создаёт:
   - Guest (find_or_initialize_by email)
   - Reservation (confirmed, auto-price)
8. `NotificationSender.send_booking_confirmation` → email гостю.
9. Успех-диалог: «Бронирование подтверждено! Мы отправили подтверждение на ваш email.»

## Alternate Flows / Exceptions

- `ALT-01` Нет доступных юнитов → пустой список, «Нет доступных юнитов».
- `ALT-02` Гость не указывает email → бронирование создаётся без гостя (block).
- `ALT-03` Email указан без имени → 422 «Guest name is required when email is provided».
- `ALT-04` Гость с таким email уже есть → переиспользуется, не дублируется.
- `ALT-05` Одно слово в имени (например "Madonna") → дублируется как first+last.
- `EX-01` Несуществующий slug → 404.
- `EX-02` Пересечение дат → 409 Conflict или 422.
- `EX-03` Rate limit (20 req/min per IP) → 429 Too Many Requests.

## Postconditions

- **Success:** Reservation создана (confirmed), Guest создан или переиспользован, email отправлен.
- **Failure:** Никакие данные не сохранены (транзакция откатывается).

## Business Rules

- `BR-01` Public API — без аутентификации. Rate-limited.
- `BR-02` Цена рассчитывается серверно через PriceCalculator (не доверяем клиенту).
- `BR-03` Widget route `meta: { widget: true }` — не проходит auth guard.
- `BR-04` Slug = Organization.slug (auto-generated from name).

## Traceability

| Upstream / Downstream | References |
|---|---|
| Features | FT-010, FT-003, FT-009 |
| E2E | `e2e/booking-widget.spec.js` |
