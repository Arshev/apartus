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

## Design

- `DEC-01` iCal export: GET /api/v1/public/ical/:token — generates ICS from unit reservations. Token-based, no auth.
- `DEC-02` Channel#ical_export_token auto-generated via before_validation (SecureRandom.urlsafe_base64).
- `DEC-03` ChannelSyncJob: fetches URL, parses VEVENT blocks, creates reservations with notes: "ical:UID". Dedup by check_in+check_out+notes.
- `DEC-04` Sync button disabled in UI when ical_import_url blank.
- `DEC-05` Platform labels localized: booking_com→Booking.com, airbnb→Airbnb, ostrovok→Островок.

## Verify

- `SC-01` iCal export returns text/calendar with VCALENDAR/VEVENT.
- `SC-02` Import creates reservations from multi-event feed.
- `SC-03` Dedup: second import doesn't duplicate.
- `SC-04` Missing DTSTART/DTEND events skipped.
- `SC-05` Sync button disabled/enabled based on import URL.
- `EVID-01` `spec/requests/api/v1/public/ical_spec.rb`
- `EVID-02` `spec/jobs/channel_sync_job_spec.rb`
- `EVID-03` `spec/requests/api/v1/channels_spec.rb`
