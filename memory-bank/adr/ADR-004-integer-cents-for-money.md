---
title: "ADR-004: Integer cents for money fields"
doc_kind: adr
doc_function: canonical
purpose: Все денежные поля хранятся как integer с суффиксом `_cents`.
derived_from:
  - ../domain/architecture.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-004: Integer cents for money

## Контекст

Нужно выбрать представление денежных сумм для БД и кода.

## Решение

Integer с суффиксом `_cents`. Например `total_cents`, `deposit_cents`. Конвертация в/из human-readable формата — на уровне serializers и UI.

## Рассмотренные варианты

| Вариант | Плюсы | Минусы |
|---|---|---|
| Integer `_cents` | Точность, простота, нет float issues | Нужна конвертация при отображении |
| Decimal | Точность | Сложнее арифметика, больше места |
| `money` gem | Удобный API | Внешняя зависимость |

## Последствия

### Положительные

- Точность без float артефактов.
- Стандартный паттерн (Stripe, Shopify).

### Отрицательные

- Каждый код, работающий с деньгами, должен помнить про `/100`.

## Влияние

Все модели с денежными полями (Phase 4 Pricing, Phase 6 Finance, Phase 7 Owners).
