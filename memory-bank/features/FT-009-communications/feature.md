---
title: "FT-009: Communications"
doc_kind: feature
doc_function: canonical
purpose: "Guest notification emails: booking confirmation, check-in reminder, check-out thank you."
derived_from:
  - ../../domain/problem.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-009: Communications

## Scope

**Backend:**
- `REQ-01` `GuestMailer` with 3 emails: `booking_confirmation(reservation)`, `check_in_reminder(reservation)`, `check_out_thank_you(reservation)`.
- `REQ-02` Auto-send `booking_confirmation` on reservation create (if guest has email).
- `REQ-03` Auto-send `check_in_reminder` on check_in action.
- `REQ-04` Auto-send `check_out_thank_you` on check_out action.
- `REQ-05` Email templates: simple text/HTML with reservation details.
- `REQ-06` `NotificationLog` model: `reservation_id`, `event_type`, `channel` (email), `sent_at`. Audit trail.
- `REQ-07` `GET /api/v1/reservations/:id/notifications` — list sent notifications.

**Frontend:**
- `REQ-08` Reservation detail/edit: notification history panel (read-only list of sent emails).
- `REQ-09` Specs.

### Non-Scope
- `NS-01` Telegram/SMS channels.
- `NS-02` Custom email templates editor.
- `NS-03` Scheduled reminders (cron-based).
