---
title: "FT-018: Subscription Plans"
doc_kind: feature
doc_function: canonical
purpose: "Plan-based feature gating: starter/professional/business/enterprise."
derived_from:
  - ../../domain/pricing-strategy.md
status: active
delivery_status: done
audience: humans_and_agents
---

# FT-018: Subscription Plans

## Scope
- `REQ-01` PlanConfig: starter/professional/business/enterprise with limits (units, users, channels, features).
- `REQ-02` Organization.plan field (default: starter).
- `REQ-03` Helper methods: can_add_units?, can_add_users?, has_feature?
- `REQ-04` Plan info included in organization API response.
- `REQ-05` Frontend can read plan_config to gate UI features (NS for now — enforcement later).
