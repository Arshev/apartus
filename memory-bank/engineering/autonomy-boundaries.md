---
title: Apartus Autonomy Boundaries
doc_kind: engineering
doc_function: canonical
purpose: Границы автономии агента на Apartus — что делает сам, где показывает план, когда останавливается и спрашивает.
derived_from:
  - ../dna/governance.md
canonical_for:
  - apartus_agent_autonomy_rules
  - apartus_escalation_triggers
status: active
audience: humans_and_agents
---

# Autonomy Boundaries

## Автопилот — без подтверждения

- Редактировать код в рамках активной feature/implementation-plan.
- Запускать локальные тесты, линтеры, `bundle exec rspec`, `yarn test`.
- Создавать ветки и коммиты в тематической ветке (не в `main`). Push и merge — супервизия (показать diff).
- Читать логи, код, документацию, memory-bank.
- Создавать и обновлять документацию в memory-bank.
- Обновлять feature package артефакты (feature.md, implementation-plan.md).

## Супервизия — делаешь, но показываешь план

- Архитектурные решения, меняющие контракт API — показать ADR до принятия.
- Новые модели и миграции — показать миграцию до `rails db:migrate`.
- Удаление кода или файлов (кроме рефакторинга внутри текущей фичи) — показать что удаляешь и почему.
- PR в `main` — показать diff и результаты тестов.
- Изменение конфигурации, маршрутов, deployment contract — показать до применения.
- Декомпозиция задачи на sub-фичи — показать разбиение до старта.

## Эскалация — остановись и спроси

- **Новые gem'ы или npm-пакеты** — никогда не добавлять без явного "да" пользователя.
- **Правки существующих миграций** — запрещены, пиши новую миграцию.
- **Реализация auth** — auth уже есть в hw-0, не трогаем без явного запроса.
- **TypeScript на frontend** — запрещён (см. [`../adr/ADR-002-no-typescript-frontend.md`](../adr/ADR-002-no-typescript-frontend.md)).
- Неясные или противоречивые бизнес-требования.
- Выбор между несколькими равноценными подходами с разными trade-offs.
- Любые действия в production или против live данных.
- Изменение payments, security, auth, compliance-sensitive интеграций.
- Конфликтующие паттерны в кодовой базе — не угадывай, спроси.
- Задача выходит за scope issue — не расширяй молча.
- Destructive git операции (`--force`, `reset --hard`, `rebase -i`, `clean -fd`, `branch -D`) без явного разрешения.
- Push в remote и merge без явной команды пользователя.

## Lifecycle Enforcement — жёсткие правила

Эти правила **не имеют исключений** — нарушение считается дефектом процесса.

### Feature lifecycle gates

1. **Автор ≠ ревьюер.** Агент, создавший `feature.md` или `implementation-plan.md`, не может проводить ревью этого же документа. Review ОБЯЗАН быть запущен как отдельный проход с чистым контекстом (отдельный agent или новая сессия).
2. **Draft → Active только через review.** Перевод `status: draft → active` допустим только после прохождения review gate с 0 замечаний. Агент не переводит статус самостоятельно после собственного drafting.
3. **Review — полный проход.** Review промпт (`.prompts/feature-review.md`, `.prompts/plan-review.md`) выполняется полностью по checklist. Результат "0 замечаний" допустим, но должен быть обоснован проверкой каждого пункта, а не по умолчанию.
4. **Итерации review.** Типичные числа — в [`../flows/review-criteria.md`](../flows/review-criteria.md) (feature.md: 2-5, plan: 1-3, code: 1-2). Первый проход часто находит 3-10 замечаний — это нормально. "0 замечаний с первого прохода" — подозрительный результат, перепроверить. Цикл: draft → review → fix → re-review → ... → 0 замечаний → status: active.
5. **Implementation-plan обязателен.** Для любой новой фичи `implementation-plan.md` создаётся между Design Ready и Execution. Пропуск допустим только для архивных фич (FT-001..018, known gap).
6. **Simplify review — отдельный проход.** Никогда не пропускается, даже для small features. Выполняется после функционального тестирования, до closure.

### Запрещённые shortcuts

- Нельзя объединять drafting и review в один проход.
- Нельзя пропускать review gate, даже если "очевидно, что всё правильно".
- Нельзя переводить `delivery_status: done` без заполненных EVID-* с конкретными артефактами (не "see output").
- Нельзя архивировать plan без прохождения всех CHK-*.
- Нельзя пропускать grounding gate (discovery context) при создании implementation-plan.
- Нельзя менять scope в implementation-plan.md без обновления feature.md.
- Нельзя объединять plan-review и code-review в один проход.

## Правило эскалации при застревании

Если замечания ревью не уменьшаются за 3 итерации — проблема upstream, а не в артефакте. Останови цикл, предложи вернуться на предыдущую стадию (feature.md, ADR, или требования).

## Session Strategy

5 уровней организации ревью — canonical source: [`../flows/review-criteria.md`](../flows/review-criteria.md).

**Дефолт для Apartus: уровень 3-4.** Уровень 5 — для фич, затрагивающих auth, payments, compliance.

- Между сессиями — handover текст со ссылками на артефакты и текущий статус.
- Context watch: если контекст >75% — завершить подзадачу и уйти в новую сессию.
