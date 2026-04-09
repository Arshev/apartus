---
title: "ADR-012: Class-level authorize in nested controllers"
doc_kind: adr
doc_function: canonical
purpose: Nested контроллеры (UnitsController под Property) вызывают `authorize Unit` (класс) во всех экшенах, а не instance-level authorize.
derived_from:
  - ../domain/architecture.md
  - ../features/FT-HW1-02-unit-crud/feature.md
status: active
decision_status: accepted
date: 2026-04-08
audience: humans_and_agents
---

# ADR-012: Class-level authorize in nested controllers

## Контекст

`UnitsController` — nested под `Property`. Стандартный Pundit pattern: `authorize unit` (instance). Но порядок обработки запроса важнее для multi-tenant isolation.

## Решение

`UnitsController` вызывает `authorize Unit` (class) во всех экшенах, включая `show/update/destroy`. Record-level изоляция реализуется через scope в контроллере: `property.units.find_by(id: params[:id])`.

Порядок обработки запроса: `find_property → authorize Unit → find_unit`.

## Рассмотренные варианты

- **Instance-level `authorize unit` в show/update/destroy** — как F1 (PropertiesController). Отбрасывается: требует загружать Unit **до** авторизации, что инвертирует порядок и ломает коллизию "нет прав + чужой `:property_id`" → AC4 F2 Spec §4.6 требует 404, не 403.

## Драйверы

- Инвариант "не раскрывать существование" сильнее семантической точности ответа.
- Multi-tenant isolation должен быть enforced через scope, не через policy record check.

## Последствия

### Положительные

- 404 на чужой `property_id` вне зависимости от прав.
- Консистентно с F1 паттерном scope через `Current.organization.<relation>`.

### Отрицательные

- `UnitPolicy` намеренно не обращается к `record` — добавление проверок `record.property...` сломает ordering.
- Нужно помнить про этот паттерн при добавлении новых nested контроллеров.

## Влияние

HW-1 F2 (UnitsController), потенциально F3–F5 и будущие nested ресурсы. См. [`../features/FT-HW1-02-unit-crud/feature.md`](../features/FT-HW1-02-unit-crud/feature.md) §4.6.
