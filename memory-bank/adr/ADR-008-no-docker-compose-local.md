---
title: "ADR-008: No Docker Compose for local dev"
doc_kind: adr
doc_function: canonical
purpose: Локальная разработка Apartus без Docker Compose. PostgreSQL нативный, deployment — Kamal.
derived_from:
  - ../ops/development.md
status: active
decision_status: accepted
date: 2026-03-27
audience: humans_and_agents
---

# ADR-008: No Docker Compose for local dev

## Решение

Не использовать Docker Compose для локальной разработки. PostgreSQL установлен нативно на dev машине. Production deploy — через Kamal (который сам управляет контейнерами).

## Драйверы

- PostgreSQL уже стоит локально.
- Rails 8 Solid Queue / Solid Cache / Solid Cable работают с PostgreSQL — Redis пока не нужен.
- Docker Compose добавляет overhead и медленнее на macOS.
- Kamal на production всё равно обслуживает контейнеризацию.

## Последствия

### Положительные

- Быстрый локальный dev loop.
- Меньше layers abstraction.

### Отрицательные

- Onboarding нового разработчика требует ручной установки PG.
- Нет identical dev/prod environments (mitigation — CI тестирует против реального PG).

## Влияние

Локальная разработка, onboarding, CI, будущий deployment.
