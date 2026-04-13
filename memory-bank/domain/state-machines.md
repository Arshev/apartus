---
title: Apartus State Machines
doc_kind: domain
doc_function: canonical
purpose: Formal status transitions for Reservation, Task, and other stateful entities.
derived_from:
  - schema.md
  - ../dna/governance.md
status: active
audience: humans_and_agents
canonical_for:
  - reservation_status_machine
  - task_status_machine
---

# State Machines

## Reservation Status

```text
confirmed ──→ checked_in ──→ checked_out
    │              │
    └──→ cancelled ←┘
```

| From | To | Guard | Trigger | Side Effects |
|------|-----|-------|---------|-------------|
| confirmed | checked_in | `can_check_in?` = true | PATCH /check_in | email: check_in_reminder, Telegram: status_change |
| checked_in | checked_out | `can_check_out?` = true | PATCH /check_out | email: check_out_thank_you, Telegram: status_change |
| confirmed | cancelled | `can_cancel?` = true | PATCH /cancel | Telegram: status_change |
| checked_in | cancelled | `can_cancel?` = true | PATCH /cancel | Telegram: status_change |

**Dead-end states:** `checked_out`, `cancelled` — no further transitions possible.

**Invalid transitions return 422:** check_out from confirmed, check_in from checked_out/cancelled, cancel from checked_out/cancelled.

**Overlap validation:** Active statuses (confirmed, checked_in) enforce no-overlap per unit via model validation + DB exclusion constraint.

## Task Status

```text
pending ──→ in_progress ──→ completed
```

| From | To | Trigger | Notes |
|------|-----|---------|-------|
| pending | in_progress | "В работу" button | |
| in_progress | completed | "Завершить" button | |

**No backward transitions.** Completed tasks have no forward button.
**No guard conditions** beyond enum validation.

## Other Entities (no state machine)

- **Guest:** No status field. Active as long as exists.
- **Expense:** No status. Created → exists → deleted.
- **Owner:** No status. Created → exists → deleted.
- **Channel:** `sync_enabled` boolean, `last_synced_at` timestamp — not a state machine.
