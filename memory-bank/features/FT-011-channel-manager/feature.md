---
title: "FT-011: Channel Manager (iCal Sync)"
doc_kind: feature
doc_function: canonical
purpose: "iCal export/import per unit for Booking.com/Airbnb calendar sync."
derived_from:
  - ../../domain/problem.md
  - ../FT-002-reservations/feature.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-011: Channel Manager (iCal Sync)

## Scope

**Backend:**
- `REQ-01` Model `Channel`: `unit_id` (FK), `platform` (enum: booking_com/airbnb/ostrovok/other), `ical_export_url` (auto-generated unique token), `ical_import_url` (URL to external calendar), `sync_enabled` (boolean), `last_synced_at`.
- `REQ-02` **iCal Export** (`GET /api/v1/public/ical/:token.ics`): generates ICS file from unit's reservations. No auth — token-based access. VEVENT per active reservation.
- `REQ-03` **iCal Import**: `ChannelSyncJob` (ActiveJob) fetches external iCal URL, parses events, creates/updates reservations with `source: "ical"` marker. Runs on manual trigger or periodic (cron placeholder).
- `REQ-04` CRUD API `GET/POST/PATCH/DELETE /api/v1/channels` for managing channel connections per unit.
- `REQ-05` Backend specs.

**Frontend:**
- `REQ-06` `/channels` — channel connections list: unit name, platform, export URL (copyable), import URL, sync status, last synced.
- `REQ-07` Dialog to add/edit channel connection. "Sync Now" button for manual import.
- `REQ-08` API client + store + specs.
- `REQ-09` Sidebar nav.

### Non-Scope
- `NS-01` OAuth-based API integrations (Booking.com Partner API, Airbnb API).
- `NS-02` Two-way rate/price sync.
- `NS-03` Automatic periodic sync (cron setup — infrastructure concern).
