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
