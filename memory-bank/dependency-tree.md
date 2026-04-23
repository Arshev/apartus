---
title: Document Dependency Tree
purpose: Карта зависимостей документов внутри memory-bank/.
status: active
derived_from:
  - dna/governance.md
---

# Document Dependency Tree

Directed acyclic graph зависимостей документов в `memory-bank/`. Поле `derived_from` задаёт прямые upstream-зависимости.

## Roots

- Навигационный root: [`memory-bank/README.md`](memory-bank/README.md)
- Семантический root: [`memory-bank/dna/principles.md`](memory-bank/dna/principles.md)

## Compressed Tree

```text
memory-bank/README.md

memory-bank/dna/principles.md
├── memory-bank/dna/README.md
├── memory-bank/dna/cross-references.md
└── memory-bank/dna/governance.md
    ├── memory-bank/dna/frontmatter.md
    ├── memory-bank/dna/lifecycle.md
    ├── memory-bank/domain/README.md
    ├── memory-bank/domain/problem.md
    ├── memory-bank/domain/architecture.md
    ├── memory-bank/domain/schema.md
    ├── memory-bank/domain/frontend.md
    ├── memory-bank/domain/api-reference.md
    ├── memory-bank/domain/state-machines.md
    ├── memory-bank/domain/permissions.md
    ├── memory-bank/domain/money-and-currency.md
    ├── memory-bank/domain/integrations-strategy.md
    ├── memory-bank/domain/pricing-strategy.md
    ├── memory-bank/engineering/README.md
    ├── memory-bank/engineering/testing-policy.md
    ├── memory-bank/engineering/coding-style.md
    ├── memory-bank/engineering/git-workflow.md
    ├── memory-bank/engineering/autonomy-boundaries.md
    ├── memory-bank/features/README.md
    ├── memory-bank/flows/README.md
    ├── memory-bank/flows/feature-flow.md
    ├── memory-bank/flows/review-criteria.md
    ├── memory-bank/flows/workflows.md
    ├── memory-bank/flows/state-schema.md
    ├── memory-bank/flows/prompts/README.md
    ├── memory-bank/flows/templates/README.md
    ├── memory-bank/flows/templates/adr/ADR-XXX.md
    ├── memory-bank/flows/templates/prd/PRD-XXX.md
    ├── memory-bank/flows/templates/use-case/UC-XXX.md
    ├── memory-bank/ops/README.md
    ├── memory-bank/ops/development.md
    ├── memory-bank/ops/stages.md
    ├── memory-bank/ops/config.md
    ├── memory-bank/ops/release.md
    ├── memory-bank/ops/runbooks/README.md
    ├── memory-bank/prd/README.md
    ├── memory-bank/use-cases/README.md
    └── memory-bank/adr/README.md
```

## Additional Dependency Edges

### DNA and Flows

- [`memory-bank/flows/feature-flow.md`](memory-bank/flows/feature-flow.md) зависит от `dna/governance.md` и `dna/frontmatter.md`.
- [`memory-bank/flows/workflows.md`](memory-bank/flows/workflows.md) зависит от `dna/governance.md` и `flows/feature-flow.md`.
- [`memory-bank/flows/state-schema.md`](memory-bank/flows/state-schema.md) зависит от `dna/governance.md`, `flows/feature-flow.md` и `engineering/git-workflow.md`.
- [`memory-bank/flows/prompts/README.md`](memory-bank/flows/prompts/README.md) и каждый конкретный промпт зависят от `dna/governance.md`, `flows/feature-flow.md` и соответствующих engineering-правил (autonomy-boundaries, testing-policy).
- [`memory-bank/flows/README.md`](memory-bank/flows/README.md) зависит от `dna/governance.md`, `flows/feature-flow.md`, `flows/workflows.md`, `flows/state-schema.md`, `flows/prompts/README.md` и `flows/templates/README.md`.

### Feature-related Docs

- [`memory-bank/engineering/testing-policy.md`](memory-bank/engineering/testing-policy.md) зависит от `dna/governance.md` и `flows/feature-flow.md`.
- [`memory-bank/features/README.md`](memory-bank/features/README.md) зависит от `dna/governance.md` и `flows/feature-flow.md`.
- Feature templates (`short.md`, `large.md`, `implementation-plan.md`) зависят от `flows/feature-flow.md`, `dna/frontmatter.md` и `engineering/testing-policy.md`.

### Product-layer Docs

- [`memory-bank/flows/templates/prd/PRD-XXX.md`](memory-bank/flows/templates/prd/PRD-XXX.md) зависит от `dna/governance.md`, `dna/frontmatter.md` и `domain/problem.md`.
- [`memory-bank/flows/templates/use-case/UC-XXX.md`](memory-bank/flows/templates/use-case/UC-XXX.md) зависит от `dna/governance.md`, `dna/frontmatter.md` и `domain/problem.md`.
- [`memory-bank/prd/README.md`](memory-bank/prd/README.md) зависит от `dna/governance.md` и `flows/templates/prd/PRD-XXX.md`.
- [`memory-bank/use-cases/README.md`](memory-bank/use-cases/README.md) зависит от `dna/governance.md` и `flows/templates/use-case/UC-XXX.md`.

### ADR

- [`memory-bank/adr/README.md`](memory-bank/adr/README.md) зависит от `dna/governance.md` и `flows/templates/adr/ADR-XXX.md`.
- Instantiated ADR (ADR-001..015) зависят от соответствующих feature.md или domain docs.

### Instantiated Features

- Все `features/FT-*/feature.md` зависят от `domain/problem.md` (и опционально от domain/architecture.md, domain/schema.md).
- Все `features/FT-*/implementation-plan.md` зависят от sibling `feature.md`.
- Все `features/FT-*/state.yml` — машинные snapshots состояния фичи по схеме из `flows/state-schema.md`. Не переопределяют `feature.md`, дополняют его.
- Use cases (UC-001..005) зависят от `domain/problem.md`.

## Reading Order

1. [`memory-bank/dna/principles.md`](memory-bank/dna/principles.md)
2. [`memory-bank/dna/governance.md`](memory-bank/dna/governance.md)
3. [`memory-bank/dna/frontmatter.md`](memory-bank/dna/frontmatter.md)
4. Product context: [`memory-bank/domain/README.md`](memory-bank/domain/README.md)
5. Delivery flow: [`memory-bank/flows/README.md`](memory-bank/flows/README.md)
6. Engineering rules: [`memory-bank/engineering/README.md`](memory-bank/engineering/README.md)
7. Ops context: [`memory-bank/ops/README.md`](memory-bank/ops/README.md)
