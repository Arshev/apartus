---
title: Quick Start
doc_kind: governance
doc_function: index
purpose: One-pager для быстрого входа в проект и feature flow. Читать вместо обхода 15 файлов.
derived_from:
  - dna/governance.md
  - flows/feature-flow.md
  - flows/review-criteria.md
status: active
audience: humans_and_agents
---

# Quick Start

## Что это

Apartus — SaaS PMS для управления арендой недвижимости. Rails 8 API + Vue 3 SPA. Memory-bank — durable knowledge layer проекта.

## Как начать сессию

1. Прочитай [`CLAUDE.md`](../CLAUDE.md) — routing table
2. Прочитай [`.prompts/session-start.md`](../.prompts/session-start.md) — полный priming
3. `git status` + `git log --oneline -5`

## Feature flow (визуально)

```text
                        SHORT FEATURE                    STANDARD FEATURE
                        ─────────────                    ────────────────
Пользователь:          "добавь X"                       "добавь X"
                            │                                │
Агент:                 feature-draft.md                 feature-draft.md
                       (short template)                 (large template)
                            │                                │
                       feature.md (draft)               feature.md (draft)
                            │                           implementation-plan.md (draft)
                            │                                │
Review (agent):        feature-review                   combined review session:
                       (та же сессия)                   feature-review + plan-review
                            │                                │
                       0 замечаний                      0 замечаний
                            │                                │
                       feature.md (active)              feature.md (active)
                            │                           plan (active)
                            │                                │
Execution:             implement.md                     implement.md
                       (без formal plan)                (STEP за STEP)
                            │                                │
Post-execution:        code-review (agent)              code-review (agent)
                       simplify review                  simplify review
                       docs-sync                        docs-sync
                            │                                │
Done:                  delivery_status: done             delivery_status: done
```

## Ключевые правила (5 штук)

1. **Автор ≠ ревьюер.** Review запускается отдельным агентом, не тем кто писал draft.
2. **Upstream-first.** Меняешь код → сначала обнови canonical owner в memory-bank/.
3. **Coverage ratchet.** Backend ≥98%, Frontend ≥93%. Никогда не понижаем без ADR.
4. **Не добавлять пакеты** без "да" от пользователя. Не трогать миграции. Не добавлять TypeScript.
5. **Fine-grained коммиты.** Push и merge — только с разрешения.

## Промпты (что когда запускать)

| Этап | Промпт | Когда |
|---|---|---|
| Priming | `session-start.md` | Начало сессии |
| Draft | `feature-draft.md` | Новая фича |
| Review | `feature-review.md` | Draft → Active |
| Plan | `plan-draft.md` | Active → Plan Ready (large only) |
| Plan review | `plan-review.md` | Plan Draft → Active |
| Execute | `implement.md` | Plan Ready → Done |
| Code review | `code-review.md` | После реализации |
| ADR | `adr-draft.md` | Нетривиальное архитектурное решение |
| Bug fix | `bug-fix.md` | Баг с regression test |
| Docs sync | `docs-sync.md` | После изменения кода |

## Где что искать

| Вопрос | Файл |
|---|---|
| Что за продукт | `domain/problem.md` |
| Стек и конвенции | `domain/architecture.md` |
| Текущие модели | `domain/schema.md` |
| Как тестируем | `engineering/testing-policy.md` |
| Что можно/нельзя | `engineering/autonomy-boundaries.md` |
| Как писать код | `engineering/coding-style.md` |
| Как коммитить | `engineering/git-workflow.md` |
| Команды запуска | `ops/development.md` |
| Review criteria | `flows/review-criteria.md` |
| Feature lifecycle | `flows/feature-flow.md` |
| Все feature packages | `features/README.md` |
| ADR | `adr/README.md` |

## Валидация

```bash
./scripts/validate-memory-bank.sh
```

Проверяет: frontmatter, broken links, staleness, orphan files.
