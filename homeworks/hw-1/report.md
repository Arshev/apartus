---
name: HW-1 Report
status: in-progress
---

# HW-1 — Отчёт

## Сводка

| # | Фича | Issue | Brief→Spec→Plan | Implement (чел/агент) | Качество (1–5) | Статус |
|---|---|---|---|---|---|---|
| 1 | Property CRUD (эталон) | #10 | 1 / 2 / 3 | ~агент (одна сессия L4) | 5 | done |
| 2 | Unit CRUD | — | — | — | — | pending |
| 3 | Amenities (M:N) | — | — | — | — | pending |
| 4 | Branches (tree) | — | — | — | — | pending |
| 5 | Property ↔ Branch | — | — | — | — | pending |

## По каждой фиче

### 01 — Property CRUD (эталон)

- **Session strategy:** уровень 4 — Brief → review → Spec → review → Plan →
  review → Implement (C1–C4) в одной сессии.
- **Итераций ревью:** Brief 1, Spec 2, Plan 3.
- **Качество результата (1–5):** 5 — AC1–AC11 покрыты, 37 request specs
  зелёные, coverage 38.22% → 55.12%, все артефакты в `active`.
- **Что пошло хорошо:**
  - Grounding Spec/Plan против реальных файлов проекта (`Permissions`,
    `Current.membership`, `RolePolicy`, factories) дал план, который
    сработал почти без правок при реализации.
  - Fine-grained коммиты (C1–C4) сделали историю читаемой и позволили
    ловить обратную связь по каждой группе изменений.
  - TAUS ревью Spec поймало реальные дыры: «(наследуется от существующего
    поведения)» без конкретных кодов, отсутствие теста на JSON key
    stability, коллизия `let(:user)` в viewer/nopriv контекстах.
  - Plan review добавил тесты на `description: null/""` и явную проверку
    `property_type` как строки — без них AC9 был бы неполным.
- **Что пошло плохо / находки на ходу:**
  - `enum :property_type` без `validate: true` бросал `ArgumentError` на
    невалидном входе вместо 422. Найдено только на C3 (при первом прогоне
    request specs). Если бы Spec явно фиксировал поведение на enum level,
    это поймалось бы в Plan. **Урок:** для фич с enum добавлять в Plan
    пункт «проверить, бросает ли enum на invalid value при присваивании».
  - В проекте отсутствует глобальный `rescue_from Pundit::NotAuthorizedError`,
    что привело бы к 500 на AC3/AC4. Пришлось трогать `BaseController`,
    что формально за пределами F1-скоупа. Зафиксировано как hardening,
    не как отдельное DEC.
- **Что изменить в промптах ревью:**
  - Spec review v2: добавить «для каждого enum-поля указать поведение при
    присваивании невалидного значения (raise vs validation error)».
  - Plan review v2: добавить «каждый шаг controller-кода должен иметь
    ссылку на конкретный AC/E сценарий».
  - Правки пока не перенесены в `PROMPTS.md` — решено накопить ещё
    наблюдений на F2 перед формализацией.

#### Reference implementation paths

- CRUD controller: `backend/app/controllers/api/v1/properties_controller.rb`
- Pundit policy: `backend/app/policies/property_policy.rb`
- Request spec: `backend/spec/requests/api/v1/properties_spec.rb`
- Factory: `backend/spec/factories/properties.rb`
- Migration: `backend/db/migrate/20260408155056_create_properties.rb`

<!-- Аналогично для 02-05 -->

## Coverage ratchet (backend)

Порог `minimum_coverage` в `backend/spec/spec_helper.rb` поднимается по мере того,
как реальное покрытие растёт с каждой реализованной фичей. Финальная цель — 80%.

| Момент | Порог | Факт | Комментарий |
|---|---|---|---|
| Старт HW-1 (hw-0 as-is) | 38 | 38.22% | Baseline, установлен при добавлении SimpleCov |
| После F1 (Property CRUD) | 54 | 55.12% | +37 request specs добавили 17 п.п. coverage |
| После F2 (Unit CRUD) | _TBD_ | _TBD_ | |
| После F3 (Amenities) | _TBD_ | _TBD_ | |
| После F4 (Branches) | _TBD_ | _TBD_ | |
| После F5 (Property↔Branch) | 80 | _TBD_ | Финальная цель ДЗ |

**Правило подъёма:** после merge каждой feature PR смотрим фактическое покрытие в CI
и поднимаем `minimum_coverage` до `floor(actual) - 1`, чтобы оставался маленький
буфер на случайные колебания (флейки, авто-генерируемый код), но регрессия блокировалась.

## Сводные выводы по неделе

_Заполнить в конце:_

- Какие типовые проблемы всплыли в Brief?
- Какие — в Spec?
- Какие — в Plan?
- Где агент справился идеально, где нужно было править руками?
- Какие адаптированные промпты ревью сохранены в `PROMPTS.md`?
