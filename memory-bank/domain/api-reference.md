---
title: Apartus API Reference
doc_kind: domain
doc_function: canonical
purpose: Complete REST API endpoint reference with methods, params, response shapes, and status codes.
derived_from:
  - architecture.md
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - apartus_api_endpoints
  - api_response_shapes
  - api_error_format
---

# API Reference

Base URL: `/api/v1`. All authenticated endpoints require `Authorization: Bearer <jwt>` and `X-Organization-Id: <id>` headers.

## Error Response Format

All errors return JSON:
- Validation errors: `{ "error": ["message1", "message2"] }` (array)
- Other errors: `{ "error": "message" }` (string)

Standard status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests.

## Auth (no X-Organization-Id)

| Method | Path | Params | Response | Notes |
|--------|------|--------|----------|-------|
| POST | /auth/sign_up | organization_name, email, password, password_confirmation, first_name, last_name | { token, refresh_token, user, organization } | Creates org + user + membership |
| POST | /auth/sign_in | email, password | { token, refresh_token, user, organizations } | Returns org list |
| POST | /auth/refresh | refresh_token | { token, refresh_token } | |
| DELETE | /auth/sign_out | | 204 | Revokes token |
| GET | /auth/me | | { user, organizations, membership } | Current session |

## Organizations

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | /organizations | — | [{ id, name, slug, role }] (no X-Org-Id needed) |
| GET | /organization | — | { id, name, slug, currency, currency_config, plan, plan_config, settings } |
| PATCH | /organization | organization: { name, currency, settings: {} } | same as GET |
| POST | /organization/test_telegram | — | { message } or 422 |

## Resources (standard CRUD)

All scoped to current organization via X-Organization-Id.

| Resource | Index | Show | Create | Update | Destroy | Extra |
|----------|-------|------|--------|--------|---------|-------|
| /properties | GET | GET /:id | POST | PATCH /:id | DELETE /:id | — |
| /properties/:pid/units | GET | GET /:id | POST | PATCH /:id | DELETE /:id | — |
| /amenities | GET | GET /:id | POST | PATCH /:id | DELETE /:id | — |
| /branches | GET | GET /:id | POST | PATCH /:id | DELETE /:id | tree endpoint |
| /guests | GET | GET /:id | POST | PATCH /:id | DELETE /:id | GET /:id/timeline |
| /reservations | GET | GET /:id | POST | PATCH /:id | DELETE /:id | PATCH /:id/check_in, /check_out, /cancel |
| /expenses | GET | — | POST | PATCH /:id | DELETE /:id | — |
| /tasks | GET | — | POST | PATCH /:id | DELETE /:id | — |
| /channels | GET | — | POST | PATCH /:id | DELETE /:id | POST /:id/sync |
| /pricing_rules | GET | — | POST | PATCH /:id | DELETE /:id | — |
| /owners | GET | GET /:id | POST | PATCH /:id | DELETE /:id | GET /:id/statement |
| /members | GET | — | POST | PATCH /:id | DELETE /:id | — |
| /roles | GET | — | POST | PATCH /:id | DELETE /:id | — |

## Nested Resources

| Method | Path | Notes |
|--------|------|-------|
| GET/POST/DELETE | /properties/:pid/photos | Photo upload/list/delete |
| GET/POST/DELETE | /units/:uid/photos | Same for units |
| GET/POST/PATCH/DELETE | /units/:uid/seasonal_prices | Seasonal price CRUD |
| GET | /reservations/:rid/notifications | Notification log history |

## Special Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | /all_units | yes | All units across properties (flat list) |
| GET | /dashboard | yes | Dashboard KPIs (finances.view required) |
| GET | /reports/financial | yes | Financial report JSON |
| GET | /reports/financial/pdf | yes | Financial report PDF download |
| GET | /health | no | { status: "ok" } |

## Public API (no auth)

| Method | Path | Notes |
|--------|------|-------|
| GET | /public/properties/:slug/availability?from=&to= | Available units with prices |
| POST | /public/properties/:slug/bookings | Create booking (rate-limited 20/min) |
| GET | /public/ical/:token | iCal export (text/calendar) |

## Filtering

Reservations: `?unit_id=&status=&from=&to=`
Expenses: `?property_id=&category=&from=&to=`
Tasks: `?status=&priority=&property_id=&assigned_to_id=`
Reports: `?from=&to=` (defaults to current month)
Owner statement: `?from=&to=&format=pdf`
