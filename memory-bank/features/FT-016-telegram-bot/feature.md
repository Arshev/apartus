---
title: "FT-016: Telegram Bot"
doc_kind: feature
doc_function: canonical
purpose: "Telegram bot для уведомлений о бронированиях и быстрых действий."
derived_from:
  - ../../domain/problem.md
  - ../../domain/integrations-strategy.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-016: Telegram Bot

## Scope

**Backend:**
- `REQ-01` `TelegramNotifier` adapter: sends messages via Telegram Bot API.
- `REQ-02` Organization settings: `telegram_bot_token`, `telegram_chat_id`. Configured in Settings.
- `REQ-03` Auto-notify on: new booking (with details), check-in, check-out, cancellation.
- `REQ-04` Message format: rich text with reservation details, guest name, dates, unit, price.

**Frontend:**
- `REQ-05` Settings → Integrations tab: Telegram bot token + chat ID fields. "Test" button sends test message.
- `REQ-06` Specs.

### Non-Scope
- `NS-01` Two-way commands (manage bookings via Telegram).
- `NS-02` Multiple chat targets per event type.

## Design

- `DEC-01` `TelegramNotifier` — class with class methods, calls Telegram Bot API via `Net::HTTP.post_form`.
- `DEC-02` Settings stored in `organization.settings` JSONB: `telegram_bot_token`, `telegram_chat_id`.
- `DEC-03` `configured?(org)` checks both fields present. Skips silently if not configured.
- `DEC-04` Message format: Markdown with emoji, reservation details (property, unit, guest, dates, price, status).
- `DEC-05` Error handling: `StandardError` rescue logs to `Rails.logger.error`, never crashes the caller.
- `DEC-06` Test button: `POST /organization/test_telegram` sends "🔔 Тестовое уведомление" message.

## Verify

- `SC-01` notify_booking sends POST to Telegram API with chat_id and formatted message.
- `SC-02` Skips when not configured (no API call).
- `SC-03` HTTP error logged, not raised.
- `SC-04` SocketError caught and logged.
- `SC-05` test_telegram returns true on success, false when not configured.
- `SC-06` Settings UI: test button disabled when fields empty, enabled when filled.
- `EVID-01` `spec/services/telegram_notifier_spec.rb`
- `EVID-02` `spec/requests/api/v1/organizations_spec.rb` (test_telegram endpoint)
- `EVID-03` `e2e/settings.spec.js` (Integrations tab)
