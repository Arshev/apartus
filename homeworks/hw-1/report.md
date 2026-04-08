---
name: HW-1 Report
status: in-progress
---

# HW-1 — Отчёт

## Сводка

| # | Фича | Issue | Brief→Spec→Plan | Implement (чел/агент) | Качество (1–5) | Статус |
|---|---|---|---|---|---|---|
| 1 | Property CRUD (эталон) | #10 | 1 / 2 / 3 | ~агент (одна сессия L4) | 5 | done |
| 2 | Unit CRUD | #11 | 2 / 3 / 4 | ~агент (L3 сессии) | 5 | done |
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

### 02 — Unit CRUD

- **Session strategy:** уровень 3 — отдельные сессии Brief / Spec / Plan,
  Implement выполнен продолжением Plan-сессии после plan → active.
- **Итераций ревью:** Brief 2, Spec 3, Plan 4 (3 раунда замечаний + финальная
  проверка).
- **Качество результата (1–5):** 5 — 52 новых примеров (48 request + 4 model),
  все AC1–AC14 и E1–E23 покрыты, F1 follow-up (PATCH с невалидным enum)
  закрыт отдельными тестами, coverage 55.85% → 61.24%.
- **Что пошло хорошо:**
  - Reference pattern F1 сработал: контроллер, policy и spec писались
    «по форме F1» почти без переосмысления.
  - `validate: true` на обоих enum добавлен в модели с первого коммита
    (C1), не понадобилось ловить `ArgumentError` постфактум — прямой
    перенос урока F1 в Spec.
  - Spec §4.6 явно зафиксировал порядок `find_property → authorize → find_unit`,
    и Plan добавил отдельный тест на коллизию «no-perm + foreign property → 404».
    Это защищает от случайной перестановки `authorize` и scope-резолва
    при будущем рефакторинге.
  - Plan review поймал реальную проблему: §6.1 Acceptance использовал
    `rails runner 'FactoryBot.create(...)'` — FactoryBot в `rails runner`
    не загружается. Заменено на транзитивную проверку через model spec.
- **Что пошло плохо / находки на ходу:**
  - D1 risk сработал: C2 (controller+policy+routes) без тестов уронил
    coverage до 46.32% < 54 floor, rspec упал на `minimum_coverage`.
    Plan §0 fallback был готов — склеили C2 и C3 в один коммит. Урок:
    для фич со значимым объёмом непокрытого production-кода C2-без-тестов
    коммит нежизнеспособен; либо сразу планировать склейку, либо
    допускать временный drop ratchet (не делали — честнее склеить).
  - Handover утверждал «factory :unit уже есть» — это была ошибка,
    `spec/factories/units.rb` отсутствовал. Поймано Plan review'ом через
    grounding. Урок: handover-текст не доверять, grounding обязателен.
- **Что изменить в промптах ревью:**
  - Plan review v2 кандидат: «для каждой группы коммитов (Cn) прикинуть
    delta coverage: сколько production-строк добавляется vs сколько
    тестов их покрывает. Если Cn добавляет prod-код без тестов, явно
    зафиксировать риск ratchet + fallback склейки с следующим Cn».
  - Plan review v2 кандидат: «команды в Acceptance шага прогнать
    мысленно через контекст их запуска (`rails runner` vs `rspec` vs
    shell) — проверить, что зависимости доступны».
  - Решено: перенести в `PROMPTS.md` после F3, как договаривались по
    F1 (накопить минимум 2 фичи для обобщения).

#### Reference implementation paths (F2)

Форма та же, что в F1 — не становится новым эталоном, но для навигации:

- CRUD controller: `backend/app/controllers/api/v1/units_controller.rb`
- Pundit policy: `backend/app/policies/unit_policy.rb`
- Request spec: `backend/spec/requests/api/v1/units_spec.rb`
- Model spec (cascade + enum `validate: true`): `backend/spec/models/unit_spec.rb`
- Factory: `backend/spec/factories/units.rb`
- Migration: `backend/db/migrate/20260408160000_create_units.rb`

## Coverage ratchet (backend)

Порог `minimum_coverage` в `backend/spec/spec_helper.rb` поднимается по мере того,
как реальное покрытие растёт с каждой реализованной фичей. Финальная цель — 80%.

| Момент | Порог | Факт | Комментарий |
|---|---|---|---|
| Старт HW-1 (hw-0 as-is) | 38 | 38.22% | Baseline, установлен при добавлении SimpleCov |
| После F1 (Property CRUD) | 54 | 55.12% | +37 request specs добавили 17 п.п. coverage |
| После F2 (Unit CRUD) | 60 | 61.24% | +52 examples (request+model), enum `validate: true` с C1, C2+C3 склеены по D1 fallback |
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
