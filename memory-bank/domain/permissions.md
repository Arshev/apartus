---
title: Apartus Permission System
doc_kind: domain
doc_function: canonical
purpose: Complete permission taxonomy, role presets, and UI feature gating map.
derived_from:
  - architecture.md
  - ../adr/ADR-011-permissions-text-array.md
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - permission_codes
  - role_presets
  - permission_ui_mapping
---

# Permission System

## Architecture

- Permissions stored as `text[]` on Role model (ADR-011).
- `Membership#can?(permission)` checks: owner? → true for all; else role.permissions.include?(code).
- `Membership#permissions` returns: owner → ALL_PERMISSIONS; else role.permissions or [].
- Pundit policies use `Current.membership&.can?(permission)`.

## Permission Codes (19)

> Note: `permissions.md` ранее заявлял 20, но `ALL_PERMISSIONS` в `app/models/concerns/permissions.rb` до FT-037 содержал 18. После FT-037 — 19 (+ `currency_rates.manage`). Рассогласование 20↔18 в pre-FT-037 доке — out of scope FT-037.


| Code | Semantics | UI Features Gated |
|------|-----------|-------------------|
| organizations.manage | Update org settings | Settings → General save, currency change |
| organizations.view | View org info | Settings → General tab visible |
| members.manage | Add/edit/delete members | Settings → Members: add/edit/delete buttons |
| members.view | View member list | Settings → Members tab visible |
| roles.manage | Create/edit/delete custom roles | Settings → Roles: add/edit/delete (non-system) |
| properties.manage | Create/edit/delete properties, units, photos, seasonal prices, channels, pricing rules | All CRUD buttons on properties, units, photos, seasonal prices, channels, pricing rules |
| properties.view | View properties, units, etc. | List/show for properties, units, seasonal prices, channels, pricing rules, photos |
| units.manage | Create/edit/delete units | Unit CRUD buttons |
| units.view | View units | Unit list, amenity attachment display |
| amenities.manage | Create/edit/delete amenities | Amenity CRUD buttons |
| amenities.view | View amenities | Amenity list |
| branches.manage | Create/edit/delete branches | Branch tree: add/edit/delete buttons |
| branches.view | View branches | Branch tree display |
| reservations.manage | Create/edit/delete reservations, check-in/out/cancel | Reservation CRUD + status transition buttons |
| reservations.view | View reservations, notification logs | Reservation list, notification history |
| finance.manage | Create/edit/delete expenses | Expense CRUD buttons |
| finance.view | View expenses, dashboard, reports, owner statements | Dashboard, Reports, Expenses, Owner Statements |
| settings.manage | Manage organization settings | Settings tabs |
| currency_rates.manage | Create/edit/delete manual currency override rates (FT-037) | Settings → Currency Rates: manual overrides CRUD. API rates read-only for everyone. |

## Preset Roles

| Role | Code | System | Permissions |
|------|------|--------|-------------|
| Администратор | admin | Yes (locked) | ALL 19 permissions (including `currency_rates.manage`) |
| Менеджер | manager | Yes (locked) | All except organizations.manage, members.manage, roles.manage, settings.manage |
| Просмотр | viewer | Yes (locked) | All *.view permissions only |

**Owner role_enum:** Membership with `role_enum: :owner` bypasses all permission checks — `can?` always returns true.

**System roles:** Cannot be edited or deleted (UI buttons disabled, backend rejects).

**Custom roles:** Created via Settings → Roles. Store arbitrary permission subset. `set_permissions` validates against `Permissions.valid?`.

## Permission Hierarchy

No implicit hierarchy. Having `properties.manage` does NOT automatically grant `properties.view`. Each permission is independent. Preset roles bundle them explicitly.

## Multi-tenancy Isolation

Permissions are per-membership (user × organization). A user can be owner in org A and viewer in org B. `Current.membership` is set per-request from `X-Organization-Id` header.
