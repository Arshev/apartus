---
title: "ADR-014: Adjacency list for Branch tree"
doc_kind: adr
doc_function: canonical
purpose: Branch-дерево реализовано через adjacency list (один столбец `parent_branch_id`).
derived_from:
  - ../domain/schema.md
  - ../features/FT-HW1-04-branches/feature.md
status: active
decision_status: accepted
date: 2026-04-09
audience: humans_and_agents
---

# ADR-014: Adjacency list for Branch tree

## Решение

`Branch.parent_branch_id` self-referential FK, иерархия обходится Ruby-кодом в custom-валидациях (cycle check, `parent_is_not_descendant` upward walk) или PostgreSQL `WITH RECURSIVE` по мере необходимости.

## Рассмотренные варианты

| Вариант | Плюсы | Минусы |
|---|---|---|
| Adjacency list | Минимум кода, Rails-standard, без новых зависимостей | Рекурсивные обходы на Ruby/SQL |
| Closure table (`branch_ancestries` + depth) | Быстрый descendants query | Удваивает сложность writes, overkill на наших объёмах |
| `ancestry` / `closure_tree` gem | Готовое решение | CLAUDE.md запрещает новые gems без явного согласования |

## Драйверы

- Ожидаемый размер дерева на организацию — десятки узлов, глубина 3–5 уровней.
- Closure table оправдана при тысячах узлов.
- `ancestry`/`closure_tree` — внешние зависимости, вне scope HW-1.

## Последствия

### Положительные

- Минимум кода, стандартный Rails паттерн.
- Custom валидации F4 (`parent_is_not_self`, `parent_is_not_descendant`, `parent_branch_must_exist_in_org`, `before_destroy`) реализуются elegantly.

### Отрицательные

- При росте до тысяч узлов на организацию потребуется пересмотр в пользу closure table (отдельная фича за пределами HW-1).

## Влияние

HW-1 F4 (Branch CRUD). См. [`../features/FT-HW1-04-branches/feature.md`](../features/FT-HW1-04-branches/feature.md).
