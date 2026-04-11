---
title: "FT-018: Subscription Plans"
doc_kind: feature
doc_function: canonical
purpose: "Plan-based feature gating: starter/professional/business/enterprise."
derived_from:
  - ../../domain/pricing-strategy.md
  - ../../domain/architecture.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-018: Subscription Plans

## Scope

**Backend:**
- `REQ-01` `PlanConfig` concern: 4 plans with limits (max_units, max_users, max_channels) and feature flags (channel_manager, booking_widget, automation, pdf_export).
- `REQ-02` `Organization.plan` field (string, default "starter", validated).
- `REQ-03` Helper methods: `can_add_units?`, `can_add_users?`, `has_feature?(feature)`.
- `REQ-04` `PlanConfig.within_limit?(current_count, max)` — unlimited = -1.
- `REQ-05` Plan config in organization API response.

**Frontend:**
- `REQ-06` Frontend reads `plan_config` from organization response.

### Non-Scope
- `NS-01` Payment integration.
- `NS-02` API-level enforcement (future).
- `NS-03` Plan upgrade/downgrade UI.

## Design

- `DEC-01` Plans as concern, not DB table — simple, no migrations.
- `DEC-02` `-1` sentinel for unlimited.
- `DEC-03` Feature flags as boolean hash keys.

### Plan Matrix

| Plan | Units | Users | Channels | Widget | PDF | Automation |
|------|-------|-------|----------|--------|-----|------------|
| starter | 3 | 1 | 0 | no | no | no |
| professional | 50 | 3 | 3 | yes | yes | no |
| business | 200 | 10 | ∞ | yes | yes | yes |
| enterprise | ∞ | ∞ | ∞ | yes | yes | yes |

## Verify

- `SC-01` `can_add_units?` boundary: false at limit, true under, true for unlimited.
- `SC-02` `can_add_users?` same behavior.
- `SC-03` `has_feature?(:pdf_export)` true for professional+, false for starter.
- `SC-04` `has_feature?(:nonexistent)` returns false.
- `SC-05` `PlanConfig.config_for(nil)` falls back to starter.
- `SC-06` Organization API includes `plan` and `plan_config`.
- `EVID-01` `spec/models/concerns/plan_config_spec.rb`
- `EVID-02` `spec/models/organization_spec.rb`
