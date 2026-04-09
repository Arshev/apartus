---
name: HW-1 — Полный цикл SDD (archived)
status: archived
---

> **Archived 2026-04-09.** HW-1 завершён (PR #6). Canonical owner архивных фич теперь — [`../../memory-bank/features/FT-HW1-*/`](../../memory-bank/features/). Оригинальные Brief/Spec/Plan артефакты остаются в `features/` этого каталога как исторический снимок SDD-процесса HW-1. Для текущей работы читай `memory-bank/`.

# Homework 1 — Spec-Driven Development end-to-end

Цель недели: пройти полный цикл **Brief → Spec → Plan → Implement** на 3–10 реальных фичах, с обязательным ревью каждого артефакта до 0 замечаний.

## Структура

```text
hw-1/
├── README.md              — этот файл (навигация)
├── report.md              — итоговый отчёт по фичам (требование сдачи)
├── PROMPTS.md             — адаптированные промпты ревью (копилка «своих» промптов)
└── features/
    ├── 01-property-crud/          🌟 Эталон CRUD
    │   ├── brief.md
    │   ├── spec.md
    │   └── plan.md
    ├── 02-unit-crud/              (по аналогии с #1, nested под Property)
    ├── 03-amenities/              (новый паттерн: M:N)
    ├── 04-branches/               (новый паттерн: self-referential tree)
    └── 05-property-branch-link/   (связка Property ↔ Branch)
```

## Статусы документов

Каждый артефакт в frontmatter имеет `status: draft | active`. Агент получает на вход
только `active`-документы (правило из `sdd-workflow.md`).

| Статус  | Значение                              |
|---------|---------------------------------------|
| `draft` | Написан, ревью не пройдено            |
| `active`| Все критерии ревью = pass, 0 замечаний|

## Линковка с GitHub

Каждая фича слинкована с GitHub issue:

- В issue — ссылки на `brief.md`, `spec.md`, `plan.md` в репозитории.
- В каждом документе — `Related issue: #N` в frontmatter.
- PR закрывает issue через `Closes #N`.

## Стратегия сессий

Дефолт — **уровень 3** из `session-strategies.md`: отдельная сессия на каждый артефакт
(Brief, Spec, Plan, Implement). Для первой фичи-эталона — **уровень 4** (исправление
замечаний до 0 в той же сессии), чтобы выработать чистый процесс.
