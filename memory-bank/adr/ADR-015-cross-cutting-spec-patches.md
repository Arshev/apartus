---
title: "ADR-015: Cross-cutting features own retrospective spec patches"
doc_kind: adr
doc_function: canonical
purpose: Когда новая фича меняет контракт ранее зафиксированной активной фичи, новая фича владеет patchем и ретроспективно обновляет старый артефакт. Historical record — после миграции в memory-bank эту роль выполняет upstream-first дисциплина из `dna/lifecycle.md`.
derived_from:
  - ../dna/lifecycle.md
status: active
decision_status: accepted
date: 2026-04-09
audience: humans_and_agents
---

# ADR-015: Retrospective spec patches

## Контекст

HW-1 F5 (Property ↔ Branch link) ретроспективно менял JSON-контракт F1 (Property) и сообщения ошибок F4 (Branch `before_destroy`). Возник вопрос: новая фича "owns override" и оставляет старые Spec'и как есть, или "owns patch" и ретроспективно обновляет старые Spec'и?

## Решение

**Новая фича owns patch.** Ретроспективно обновляет текст старого Spec'а и фиксирует изменение в своём §13 docs sync. Сопровождается inline-нотой в старом Spec'е: `F<N> retrospective update (<date>): ...`.

## Драйверы

- Чистота актуального состояния > исторической immutability.
- Читатель старого Spec'а видит актуальный контракт без поиска override-цепочки.
- Консистентно с `SCHEMA.md` / `PLAN.md` / теперь `memory-bank/domain/schema.md`, которые редактируются непрерывно.
- "Owns override" не масштабируется: каждый новый читатель должен знать обо всех override-фичах.

## Последствия

### Положительные

- Один source of truth на момент чтения.
- Не нужно "накладывать override diff в голове".

### Отрицательные

- Историческая форма старого Spec'а теряется в текущей версии файла (восстанавливается через git log).

## Historical note

После миграции apartus в memory-bank (HW-2) эту роль формально выполняет принцип **Upstream first / Downstream sync** из [`../dna/lifecycle.md`](../dna/lifecycle.md). ADR-015 остаётся активным как исторический контекст для понимания HW-1 artefact updates, но новые фичи опираются на lifecycle rules memory-bank, не на этот ADR напрямую.

## Влияние

HW-1 F5 был первым применением. HW-2+ опираются на `dna/lifecycle.md`.
