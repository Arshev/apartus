---
title: Glossary
doc_kind: governance
doc_function: canonical
purpose: Терминология memory-bank — SSoT, canonical owner, delivery status и другие ключевые понятия.
derived_from:
  - dna/governance.md
status: active
audience: humans_and_agents
---

# Glossary

## Durable Knowledge Layer

`Durable knowledge layer` — устойчивый слой знаний проекта: набор versioned документов в `memory-bank/`, который сохраняет контекст между сессиями, участниками и изменениями в коде.

## SSoT

`SSoT` (`Single Source of Truth`) — принцип, по которому каждый факт имеет ровно одного canonical owner. Дублирование факта в нескольких местах — дефект документации.

## Canonical Owner

`Canonical owner` — документ, который владеет конкретным фактом и имеет приоритет над downstream-описаниями.

## Governed Document

`Governed document` — markdown-файл с YAML frontmatter, подчиняющийся governance-правилам из `memory-bank/dna/`.

## Authoritative Document

`Authoritative document` — governed-документ со `status: active`, считающийся действующим источником истины.

## Dependency Tree

`Dependency tree` — directed acyclic graph зависимостей между документами, построенный через `derived_from`. Authority течёт upstream → downstream.

## Upstream And Downstream

`Upstream` — документ-источник, от которого наследуется контекст. `Downstream` — документ, который использует этот контекст и не должен ему противоречить.

## Derived From

`Derived from` — frontmatter-поле, перечисляющее прямые upstream-документы. Делает происхождение знания явным.

## Progressive Disclosure

`Progressive disclosure` — правило организации: сначала короткий обзор, потом ссылки на детали.

## Index-First

`Index-first` — каждый значимый документ должен быть достижим из индекса. Orphan-файл — дефект knowledge layer.

## Feature Package

`Feature package` — каталог `FT-XXX/` в `memory-bank/features/`, содержащий canonical `feature.md`, optional `implementation-plan.md` и routing `README.md`.

## PRD

`PRD` (`Product Requirements Document`) — документ уровня продуктовой инициативы. Фиксирует что и зачем меняется до декомпозиции на feature slices.

## ADR

`ADR` (`Architecture Decision Record`) — документ, фиксирующий архитектурное решение, его контекст и rationale. Отвечает на вопрос «почему именно так».

## Status

`Status` — публикационный статус документа: `draft`, `active`, `archived`. Отвечает за то, считается ли документ действующим источником истины.

## Delivery Status

`Delivery status` — lifecycle-статус feature: `planned`, `in_progress`, `done`, `cancelled`. Отдельная ось от публикационного `status`.

## Decision Status

`Decision status` — lifecycle-статус ADR: `proposed`, `accepted`, `superseded`, `rejected`. Показывает судьбу решения.

## Wrapper Template

`Wrapper template` — governed-шаблон с `doc_function: template`, содержащий embedded contract (frontmatter + body) для инстанцируемого документа.

## Coverage Ratchet

`Coverage ratchet` — механизм, при котором порог coverage поднимается после каждой feature до `floor(actual) - 1` и никогда не понижается без ADR.

## Multi-Tenant Isolation

`Multi-tenant isolation` — архитектурный принцип Apartus: все данные scoped через `Current.organization`. Запрос к чужой организации → 404 (не 403).

## Vertical Slice

`Vertical slice` — одна единица пользовательской ценности, пронизывающая все затронутые слои (UI, API, storage). Feature = vertical slice.

## Documentation Layer

`Documentation layer` — не просто папка с markdown-файлами, а структурированный слой знаний с ролями документов, навигацией и границами ответственности. В этом проекте — `memory-bank/`.

## Process Layer

`Process layer` — часть knowledge layer, описывающая lifecycle, workflows, gates и шаблоны исполнения. В этом проекте — `memory-bank/flows/`.

## Instantiated Document

`Instantiated document` — конкретный документ проекта, созданный из шаблона и заполненный реальным контекстом. В отличие от template-документа, описывает конкретную фичу, решение или сценарий.

## Embedded Template Contract

`Embedded template contract` — та часть wrapper-template, которая копируется в новый instantiated документ. Содержит frontmatter и body целевого артефакта.

## State File

`State file` (`state.yml`) — машинно-читаемый снимок текущего состояния feature package (`memory-bank/features/FT-NNN/state.yml`). Отвечает на вопрос «где мы сейчас»: `phase`, `current_step`, `blockers`, `branch`. Дополняет `feature.md` (canonical scope) и `implementation-plan.md` (derived plan), но не переопределяет их. Schema и правила — в [`flows/state-schema.md`](flows/state-schema.md).

## Phase

`Phase` — lifecycle-стадия фичи внутри `state.yml`: `bootstrap`, `draft`, `design_ready`, `plan_ready`, `execution`, `done`, `cancelled`. Отражает прохождение gate-ов из `flows/feature-flow.md` в машинной форме.

## Blocker

`Blocker` — запись в `state.yml.blockers[]` о том, что мешает перейти к следующему шагу. Kind: `open_question` (OQ из плана), `approval_gate` (AG из плана), `external` (зависимость от другой команды/сервиса), `adhoc` (возникло в сессии).

## Active Feature Resolver

`Active feature resolver` — правило определения активной фичи для текущей session/tab: сначала `CLAUDE_ACTIVE_FEATURE` env var, затем git branch regex (`[Ff][Tt][-_/]?[0-9]+`), иначе пусто. Multi-tab safe: нет одного глобального указателя, у каждой вкладки своя активная фича через свою ветку. Canonical: [`flows/state-schema.md`](flows/state-schema.md).
