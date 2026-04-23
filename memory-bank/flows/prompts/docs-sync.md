---
title: "Priming Prompt: Docs Sync"
doc_kind: governance
doc_function: prompt
purpose: Upstream-first синхронизация canonical owners и downstream-документов после изменения кода/схемы/контракта.
derived_from:
  - ../../dna/governance.md
  - ../../dna/lifecycle.md
status: active
audience: humans_and_agents
---

# Prompt: Docs Sync (Upstream First)

Ты только что изменил код / поведение / схему / контракт. Нужно прогнать upstream-first sync по [`memory-bank/dna/lifecycle.md`](../../dna/lifecycle.md).

## Алгоритм

1. **Upstream first** — найди canonical owner изменённого факта:
   - Изменил модель/поле/индекс → `memory-bank/domain/schema.md`
   - Изменил API контракт или error handling → `memory-bank/domain/architecture.md` или `feature.md` фичи
   - Изменил testing подход → `memory-bank/engineering/testing-policy.md`
   - Изменил dev команду или setup → `memory-bank/ops/development.md`
   - Изменил решение → новый или обновлённый ADR в `memory-bank/adr/`
2. **Обнови canonical owner** с актуальной информацией.
3. **Downstream sync** — проверь `derived_from` всех зависимых документов. Если upstream изменил факт, на который они ссылаются — обнови и их.
4. **README sync** — если добавлен/удалён/переименован документ, обнови parent `README.md`.
5. **Conflict = report** — если нашёл расхождение в чужом документе, к которому не имеешь отношения → сообщи пользователю как finding, не правь молча.

## Antipatterns

- Писать факт в `feature.md`, если canonical owner — `domain/architecture.md`.
- Дублировать один и тот же факт в нескольких местах (SSoT violation).
- Оставлять "TODO: sync docs" в коде — сразу обновляй.

## Freshness markers

После обновления canonical owner — обнови `last_verified: YYYY-MM-DD` в frontmatter high-churn документов (schema.md, testing-policy.md, features/README.md, api-reference.md, frontend.md). Подробнее: [`memory-bank/dna/lifecycle.md`](../../dna/lifecycle.md) секция "Staleness Detection".

## Выход

Список тронутых документов с коротким описанием изменений + подтверждение, что всё в актуальной консистентности.
