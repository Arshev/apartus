---
title: Review Criteria
doc_kind: governance
doc_function: canonical
purpose: "Canonical review criteria для всех артефактов (feature.md, implementation-plan.md, code). Два слоя: artifact review и code review. Базируется на IEEE 830 / ISO 29148 / INCOSE, адаптировано для AI-driven development."
derived_from:
  - ../dna/governance.md
  - feature-flow.md
canonical_for:
  - review_criteria_feature
  - review_criteria_plan
  - review_criteria_code
  - review_session_strategy
  - taus_to_ieee_mapping
status: active
audience: humans_and_agents
---

# Review Criteria

Review — не финальная проверка, а основной рабочий процесс. Каждый артефакт проходит ревью до перехода на следующую стадию.

## Два слоя ревью

### 1. Artifact review (feature.md, implementation-plan.md)

**Когда:** до написания кода.
**Зачем:** поймать ошибки, пока они дешёвые.
**Кто:** агент ревьюит (отдельный от автора), человек принимает решение.

Найти пропущенный edge case в 200-строчной спеке — 5 минут. Найти его же в 1500-строчном PR — 40 минут.

### 2. Code review

**Когда:** после реализации, перед merge.
**Зачем:** убедиться, что код соответствует спеке.
**Кто:** сначала agent-first review, потом человек.

Agent-first review — агент ревьюит собственный код до того, как его увидит человек. Отсекает забытые edge cases, нарушенные инварианты, несоответствие AC.

## Зачем несколько итераций

- Каждый проход — свой фокус. Проверка на полноту и на непротиворечивость — разные задачи.
- Правки порождают новые проблемы. Исправление в одном месте может сломать согласованность с другим.
- Разные промпты видят разное. TAUS найдёт двусмысленность, но пропустит архитектурный конфликт.

**Документ не переходит на следующий шаг, пока ревью не даст 0 замечаний.**

Типичные итерации: feature.md 2-5, implementation-plan.md 1-3, code 1-2.

## Критерии feature.md review (Spec-level)

feature.md в Apartus объединяет Brief (What/Problem) и Spec (How/Verify). Критерии применяются к обеим частям.

### Базовый набор (TAUS) — ежедневное использование

| Критерий | Что проверяем |
|---|---|
| **T**estable | По каждому SC/CHK можно написать автотест. AC описывают поведение, не реализацию |
| **A**mbiguous-free | Формулировки однозначны. Нет "быстро", "удобно", "при необходимости", "и т.д." |
| **U**niform | Покрыты все состояния (happy, error, empty, unauthorized, cross-org). Нет "хвостов" |
| **S**coped | Одна фича, scope ≤1500 слов, не более 3 модулей. NS-* явно ограничивает |

### Расширенный набор (IEEE 830 / ISO 29148) — для критичных фич

| # | Критерий | Что проверяем |
|---|---|---|
| 1 | **Correct** | Спека точно отражает намерение из Problem. Каждый REQ-* прослеживается к проблеме. Нет додумывания |
| 2 | **Unambiguous** (= TAUS A) | Каждое требование допускает ровно одну интерпретацию. Нет escape clauses ("если возможно", "где применимо") |
| 3 | **Complete** (= TAUS U) | Все состояния описаны: loading, error, success, empty. Edge cases: пустые коллекции, граничные значения. Нет open-ended списков |
| 4 | **Consistent** | Нет конфликтов между REQ-* внутри спеки. Нет конфликтов с инвариантами системы. Терминология согласована с glossary.md |
| 5 | **Verifiable** (= TAUS T) | AC описывают поведение: "при пустом email — 422", не "валидатор проверяет email". Количественные требования имеют границы |
| 6 | **Scoped** (= TAUS S) | Одна фича. Scope явно ограничен через NS-*. Нет "заодно ещё вот это" |
| 7 | **Necessary** | Каждый REQ-* нужен — убери его, и фича не решает задачу. Нет gold plating |
| 8 | **Feasible** | Каждый REQ-* реализуем в текущем стеке. Нет требований, противоречащих техническим ограничениям |
| 9 | **Traceable** | Каждый REQ-* связан с Problem (назад) и с SC-*/CHK-* (вперёд). Traceability matrix заполнена |
| 10 | **Grounded** (AI-specific) | Привязка к кодовой базе: файлы, модули, API в Change Surface. Ограничения на реализацию. Зависимости от существующих компонентов |

### Маппинг TAUS → IEEE 830

| Стандартный критерий | IEEE 830 | ISO 29148 | INCOSE | TAUS |
|---|---|---|---|---|
| Correct | + | + | + | — (отдельно) |
| Unambiguous | + | + | + | A |
| Complete | + | + | + | U |
| Consistent | + | + | + | U (частично) |
| Verifiable | + | + | + | T |
| Singular/Scoped | — | + | + | S |
| Feasible | — | + | + | — (отдельно) |
| Traceable | + | — | — | — (отдельно) |
| Necessary | — | + | + | — (отдельно) |

**TAUS — рабочее упрощение.** Полный набор — для критичных фич или когда TAUS-ревью не ловит проблемы.

## Критерии implementation-plan.md review

| Критерий | Что проверяем |
|---|---|
| Не переопределяет | Plan не override scope/architecture/acceptance из feature.md |
| Grounded | Discovery context заполнен: paths, patterns, OQ-*, test surfaces |
| Sequenced | Порядок STEP-* логичен, зависимости учтены, нет циклов |
| Verifiable | Каждый STEP имеет check command и evidence |
| Traceable | STEP-* ссылается на canonical IDs из feature.md |
| Safe | Рискованные действия закрыты AG-* |
| Test strategy | Planned automated coverage, required suites, manual-only gaps с justification |

## Критерии code review

### Соответствие спеке (SDD-specific)

- Код реализует все AC из feature.md — ни один SC-*/CHK-* не пропущен
- Код не делает лишнего — нет функциональности, которой нет в спеке (gold plating)
- Инварианты из feature.md не нарушены
- Ограничения на реализацию (CON-*, NT-*) соблюдены

### Корректность

- Edge cases обработаны (null, пустые коллекции, граничные значения)
- Нет off-by-one, race conditions, утечек ресурсов

### Безопасность

- Нет SQL injection, XSS, command injection (OWASP Top 10)
- Секреты не захардкожены
- Входные данные валидируются на границе системы

### Читаемость

- Именование отражает намерение
- Функции делают одну вещь
- Нет дублирования (но и нет преждевременных абстракций — три строки лучше premature abstraction)

### Архитектура

- Изменение в правильном слое
- Зависимости идут в правильном направлении
- Не ломает существующие контракты
- Изменение соразмерно задаче

### Тесты

- Покрывают AC из feature.md
- Проверяют поведение, не реализацию
- Тест упадёт, если сломать то, что он защищает

### Производительность

- Нет O(n²) там, где можно O(n)
- Нет N+1 запросов
- Запросы используют индексы

### Кто что проверяет

| Слой | Кто |
|---|---|
| Стиль, линтинг, форматирование | CI (rubocop, eslint) |
| Типовые баги, безопасность, паттерны | Agent-first review |
| Архитектурное соответствие | Agent + человек |
| Бизнес-корректность | Человек + AC из feature.md |

## Session Strategy — 5 уровней

| Уровень | Описание | Когда |
|---|---|---|
| 1 | Всё в одной сессии | Простая задача, знакомый домен |
| 2 | Отдельные файлы, одна сессия ревью | Типичная мелкая фича |
| 3 | Каждый артефакт ревьюится в отдельной сессии | Типичная фича (default) |
| 4 | Ревью + фикс в одной сессии, но отдельно от drafting | Стандартная фича, первые итерации SDD |
| 5 | Ревью, план фиксов и фиксы — три отдельных сессии | Критичная фича, сложный домен |

**Выбор по умолчанию для Apartus: уровень 3-4.** Уровень 5 — для фич, затрагивающих auth, payments, compliance.

## Combined Review Sessions

Для standard features (large template) допустимо объединить feature review и plan review в одну сессию при условии:
- Это два отдельных прохода (сначала feature.md, потом plan)
- Review выполняется отдельным агентом (enforcement: автор ≠ ревьюер)
- Каждый артефакт проходит свой checklist полностью

Это сокращает flow с 4-6 до 2-3 сессий без потери качества.

## Полный review cycle

### Large feature (standard path)

```text
feature.md (draft) + implementation-plan.md (draft)
  → combined review session (agent):
      feature-review → фиксы → re-review → 0 замечаний → feature.md (active)
      plan-review → фиксы → re-review → 0 замечаний → plan (active)
  → Execution (implement.md)
  → Agent-first code review (code-review.md)
  → Human code review (PR)
  → Merge
```

### Short feature (fast track)

```text
feature.md (draft, short template)
  → feature-review (agent) → фиксы → 0 замечаний → feature.md (active)
  → Execution (без formal plan)
  → Agent-first code review + simplify review
  → Merge
```
