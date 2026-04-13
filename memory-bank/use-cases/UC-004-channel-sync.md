---
title: "UC-004: Channel Sync (iCal)"
doc_kind: use_case
doc_function: canonical
purpose: "Connect unit to OTA platform via iCal: export calendar + import bookings."
derived_from:
  - ../domain/problem.md
status: active
audience: humans_and_agents
---

# UC-004: Channel Sync (iCal)

## Goal

Менеджер подключает юнит к площадке (Booking.com, Airbnb) через iCal, синхронизирует календарь в обе стороны.

## Primary Actor

Менеджер (роль: owner или member с properties.manage).

## Trigger

Менеджер открывает `/channels` → «Добавить канал».

## Preconditions

- Юниты существуют в организации.
- У площадки есть iCal export URL (для импорта).

## Main Flow

### Export (Apartus → площадка)

1. Менеджер создаёт канал: выбирает юнит, платформу.
2. Система генерирует `ical_export_token` (SecureRandom.urlsafe_base64).
3. Export URL: `/api/v1/public/ical/:token.ics` — публичный, без auth.
4. Менеджер копирует URL (кнопка copy) → вставляет в настройки площадки.
5. Площадка периодически fetch'ит iCal → видит бронирования.

### Import (площадка → Apartus)

1. Менеджер вводит iCal import URL от площадки → сохраняет.
2. Нажимает «Sync» → `POST /channels/:id/sync`.
3. `ChannelSyncJob` (ActiveJob):
   a. Fetch iCal URL → parse VEVENT блоки (DTSTART, DTEND, UID, SUMMARY).
   b. Для каждого event: check if reservation exists (by check_in + check_out + notes:"ical:UID").
   c. Если новый → create Reservation (confirmed, guests_count=1, price=0).
   d. Update `channel.last_synced_at`.
4. Бронирования появляются в календаре и списке.

## Alternate Flows / Exceptions

- `ALT-01` Канал без import URL → кнопка «Sync» disabled.
- `ALT-02` Пустой iCal (нет VEVENT) → ничего не импортируется, last_synced_at обновляется.
- `ALT-03` Event без DTSTART/DTEND → пропускается.
- `ALT-04` Повторный sync → dedup, не дублирует.
- `EX-01` HTTP ошибка при fetch → логируется, job не падает.
- `EX-02` Невалидный iCal формат → parse возвращает пустой массив.

## Postconditions

- **Export:** Площадка видит актуальный календарь юнита.
- **Import:** Бронирования с площадки отображаются в Apartus.

## Business Rules

- `BR-01` Export token уникален per channel, генерируется автоматически.
- `BR-02` Import создаёт бронирования с notes:"ical:UID" для dedup.
- `BR-03` Platform labels локализованы: booking_com→Booking.com, airbnb→Airbnb, ostrovok→Островок.
- `BR-04` Sync не удаляет бронирования — только создаёт новые.

## Traceability

| Upstream / Downstream | References |
|---|---|
| Features | FT-011 |
| E2E | `e2e/channels.spec.js` |
| Specs | `spec/jobs/channel_sync_job_spec.rb`, `spec/requests/api/v1/channels_spec.rb`, `spec/requests/api/v1/public/ical_spec.rb` |
