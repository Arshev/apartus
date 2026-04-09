---
title: "ADR-011: Permissions as text[] array on Role"
doc_kind: adr
doc_function: canonical
purpose: Разрешения ролей хранятся как PostgreSQL text[] массив на модели Role.
derived_from:
  - ../domain/schema.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-011: Permissions as text[]

## Решение

`Role.permissions` — `text[]` (PostgreSQL array). Ключи permissions определены в `Permissions` concern как константы.

## Рассмотренные варианты

| Вариант | Плюсы | Минусы |
|---|---|---|
| `text[]` на Role | Простота, нет join таблиц, быстрый check через `ANY` | Нет FK integrity на ключи |
| Отдельная `Permission` модель + join | Нормализованно, FK integrity | Оверхед для простого кейса |
| Enum ролей без гранулярности | Совсем просто | Нет кастомизации |

## Драйверы

- Нужна кастомизация ролей без отдельной таблицы.
- Размер permission set небольшой (десятки ключей), поддерживается в коде.
- PostgreSQL array — эффективный вариант для такого кейса.

## Последствия

### Положительные

- Минимум SQL, минимум моделей.
- Полная кастомизация: организация заводит свой Role со своим набором ключей.

### Отрицательные

- Контроль валидности ключей — на уровне Ruby кода, не БД.
- Миграция permissions требует дополнительной логики.

## Влияние

RBAC, Pundit policies (`permit?("properties.create")`), preset roles при `Organization.create`.
