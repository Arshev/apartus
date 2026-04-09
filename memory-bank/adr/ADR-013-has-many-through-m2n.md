---
title: "ADR-013: has_many :through for Unit ↔ Amenity M:N"
doc_kind: adr
doc_function: canonical
purpose: M:N связи в Apartus реализуются через явную join-модель и `has_many :through`, не HABTM.
derived_from:
  - ../domain/schema.md
status: active
decision_status: accepted
date: 2026-04-08
audience: humans_and_agents
---

# ADR-013: has_many :through for M:N

## Решение

Unit ↔ Amenity реализована через явную модель `UnitAmenity` и `has_many :through :unit_amenities`. Этот паттерн — canonical для всех M:N в Apartus.

## Рассмотренные варианты

- **HABTM** — `has_and_belongs_to_many`. Отбрасывается: устарел в Rails 8 best practices, нет модели для валидаций/callbacks/join-атрибутов.

## Драйверы

- `UnitAmenity` как полноценный ActiveRecord позволяет:
  - явные валидации (`uniqueness [unit_id, amenity_id]`);
  - callbacks и observers при необходимости;
  - join-атрибуты в будущем (`attached_at`, `source`, `confidence`);
  - `before_destroy` callback на `Amenity` с кастомным сообщением (инвариант F3 §3.5.6) — что невозможно в HABTM.

## Последствия

### Положительные

- Гибкость для добавления join-атрибутов.
- Явные валидации и callbacks.

### Отрицательные

- Чуть больше boilerplate, чем HABTM.

## Влияние

HW-1 F3 (Amenity CRUD), паттерн для всех будущих M:N в проекте.
