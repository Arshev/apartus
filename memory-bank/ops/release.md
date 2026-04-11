---
title: Release And Deployment
doc_kind: engineering
doc_function: canonical
purpose: Release flow Apartus (placeholder — полноценный flow появится после первого production deploy).
derived_from:
  - ../dna/governance.md
status: active
audience: humans_and_agents
---

# Release And Deployment

Apartus пока не имеет production environment. Release flow ограничен merge в `main` + обновление coverage badges.

## Current Flow

1. Работа в тематической ветке (`hw-N`, `feature/*`).
2. Fine-grained commits (см. [`../engineering/git-workflow.md`](../engineering/git-workflow.md)).
3. Локально зелёные тесты: `bundle exec rspec`, `yarn test:coverage`, `yarn build`.
4. PR в `main`, CI проверяет те же суита.
5. Merge через GitHub UI (squash или merge commit — по ситуации).
6. После merge: coverage badges обновляются автоматически, план в memory-bank/features/FT-*/ помечается `delivery_status: done`, план `status: archived`.

## Future Deployment

Планируется Kamal (см. [`../adr/ADR-008-no-docker-compose-local.md`](../adr/ADR-008-no-docker-compose-local.md) — Docker Compose не используется локально, но Kamal запускает docker в production). Когда появится production — задокументировать rollback unit, approval gates, release test plan.

## CI Jobs

| Job | Tool | Trigger | Purpose |
|-----|------|---------|---------|
| `backend-test` | RSpec | push/PR to main | Full backend suite + SimpleCov ratchet (98%) |
| `backend-lint` | RuboCop | push/PR to main | Code style (0 offenses) |
| `frontend-test` | Vitest | push/PR to main | Unit/integration tests + coverage (93%) |
| `frontend-build` | Vite | push/PR to main | Production build verification |

## Pre-Merge Checklist

- [ ] `bundle exec rspec` — 1105 specs, 0 failures
- [ ] `bundle exec rubocop` — 0 offenses
- [ ] `cd frontend && yarn test` — 409 specs, 0 failures
- [ ] `cd frontend && yarn build` — clean production build
- [ ] Coverage ratchets met (BE ≥98%, FE ≥93%)
- [ ] E2E: `npx playwright test` — 220 specs (requires running backend + seed)
