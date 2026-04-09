---
name: F5 Plan — Property ↔ Branch link
status: active
related_issue: "#5"
umbrella_issue: "#1"
spec: ./spec.md
brief: ./brief.md
feature: 05-property-branch-link
---

# Plan — Property ↔ Branch link

> Финальная фича HW-1. Форма отличается от F1–F4: не вводит новой
> сущности, а изменяет существующие F1 Property и F4 Branch
> контракты. Реализация, тесты существующих фич и документация
> меняются в одном flow.

## 0. Группировка коммитов

F5 — **горизонтальная** фича, и структура коммитов немного другая,
чем в F1–F4:

| # | Группа | Файлы | Шаги |
|---|---|---|---|
| C1 | Migration + F1 Property model + F4 Branch model updates | `db/migrate/*_add_branch_to_properties.rb`, `app/models/property.rb`, `app/models/branch.rb` | §1, §2 |
| C2 | F1 controller + F5 request specs + F1/F4 regression updates | `app/controllers/api/v1/properties_controller.rb`, `spec/requests/api/v1/properties_spec.rb` (update + new F5 tests), `spec/requests/api/v1/branches_spec.rb` (update AC6 message), `spec/models/branch_spec.rb` (update describe + message), factory updates if needed | §3, §4, §5 |
| C3 | Coverage ratchet bump + F1/F4 Spec retrospective patches + docs sync | `backend/spec/spec_helper.rb`, `homeworks/hw-1/features/01-property-crud/spec.md`, `homeworks/hw-1/features/04-branches/spec.md`, `ai-docs/PLAN.md`, `ai-docs/SCHEMA.md`, optional `ai-docs/DECISIONS.md`, `homeworks/hw-1/report.md`, `CLAUDE.md` (HW-1 section removal) | §6, §7 |
| C4 | (conditional) hw-0 tests to reach coverage 80% | `spec/requests/api/v1/auth/sessions_spec.rb` и/или similar hw-0 specs | §8 |

**⚠️ Ключевые отличия от F1–F4 Plan структуры:**

- **Нет отдельного C3 factory+specs** — F5 не вводит новой
  factory, и specs встроены в C2 (F5 tests + regression updates в
  одном коммите, чтобы suite оставался зелёным).
- **C3 = docs sync** (был C4 в F1–F4), так как нет отдельного
  factory-spec коммита.
- **C4 — conditional** — добавляется только если F5 implementation
  alone не даёт 80% coverage. После C3 прогнать `rspec` и решить
  по процедуре Spec §13 D8.
- **C3 trogayeat F1 и F4 Spec-документы** — это первое
  ретроспективное изменение старых spec'ов в HW-1 (D2 решение).

**Риск D1 (ratchet) в C1.** C1 — это только migration + model
изменения, без новых controller/specs. Ratchet floor 71. Migration
сама по себе добавляет FK и `belongs_to` — это ~5 production строк.
Model Property получает одну custom validation (+10 строк), Model
Branch меняется (~5 строк). Итого +20 строк production, без новых
тестов. Это **может** уронить coverage на 0.5–1pp, но не критично —
72.38% - 1 ≈ 71.4%, всё ещё выше 71. Если вдруг падение больше
ожидаемого — склейка C1+C2.

**Порядок внутри C2:** controller changes → F1 specs update (сразу
после изменения JSON) → F4 specs update → F5 new tests. Все в одном
коммите.

**Grounding §0** (проверено):

- `backend/app/models/property.rb` — после F1 содержит
  `belongs_to :organization`, `has_many :units`, enums, validates.
  F5 добавляет `belongs_to :branch, optional: true` и custom
  validation.
- `backend/app/models/branch.rb` — после F4 содержит
  `has_many :children`, `before_destroy :prevent_destroy_if_has_children`.
  F5 добавляет `has_many :properties`, переименовывает callback на
  `prevent_destroy_if_has_dependents`, расширяет условие.
- `backend/app/controllers/api/v1/properties_controller.rb` —
  после F1 содержит `permit(:name, :address, :property_type,
  :description)`. F5 добавляет `:branch_id` в permit и
  `resolve_branch_or_error` helper в private с sentinel pattern
  F4.
- `backend/spec/requests/api/v1/properties_spec.rb` — после F1
  содержит тест «returns JSON with exactly the documented set of
  keys» с точным массивом ключей. F5 обновляет этот массив,
  добавляя `branch_id`.
- `backend/spec/requests/api/v1/branches_spec.rb` — после F4
  содержит AC6 тест с literal сообщением «Branch has children and
  cannot be deleted». F5 обновляет на «Branch has dependents and
  cannot be deleted».
- `backend/spec/models/branch_spec.rb` — содержит `describe
  "before_destroy :prevent_destroy_if_has_children"` + 3 теста.
  F5 переименовывает describe, обновляет literal сообщение.
- Ratchet floor: `minimum_coverage line: 71` (F4 post-bump, actual
  72.38%).
- `backend/spec/models/property_spec.rb` — **не существует**
  (проверено: `spec/models/` содержит `amenity_spec.rb`,
  `branch_spec.rb`, `membership_spec.rb`, `organization_spec.rb`,
  `unit_amenity_spec.rb`, `unit_spec.rb`, `user_spec.rb`). F5 §4.3
  создаёт его с нуля.

---

## 1. Migration `add_branch_to_properties`

**Файл (новый):** `backend/db/migrate/<ts>_add_branch_to_properties.rb`

```ruby
class AddBranchToProperties < ActiveRecord::Migration[8.1]
  def change
    add_reference :properties, :branch,
                  null: true,
                  foreign_key: { to_table: :branches, on_delete: :restrict }
  end
end
```

**Обоснования (Spec):**

- `add_reference` — стандартный Rails pattern для добавления FK на
  существующую таблицу. Создаёт колонку `branch_id` (bigint) и
  индекс на неё автоматически.
- `null: true` — Spec §3.1 nullable (Brief critical invariant
  «Branch опциональна над Property»).
- `foreign_key: { to_table: :branches, on_delete: :restrict }` —
  explicit FK к `branches` с `RESTRICT` на DB-уровне (§13 D7).
  DB-уровень — вторая линия защиты; основная защита от удаления
  branch с properties — ORM `before_destroy` (F4 callback,
  расширяется F5).
- Дефолтный index на `branch_id` (§13 D6) — нужен для
  `branch.properties.exists?` lookup в `before_destroy`.

**Команды:**

```bash
cd backend
bin/rails g migration AddBranchToProperties branch:references
# Привести к виду выше (null: true, on_delete: :restrict).
bin/rails db:migrate
bin/rails db:migrate RAILS_ENV=test
```

**Acceptance:**

- `db/schema.rb` — колонка `branch_id` в `properties`, FK с
  `on_delete: :restrict`, индекс на `branch_id`.
- `bin/rails db:migrate:status` → `up` в **dev**.
- `bin/rails db:migrate:status RAILS_ENV=test` → `up` в **test**.

---

## 2. Model updates

### 2.1. `Property` — добавить `belongs_to :branch` и custom validation

**Изменение:** `backend/app/models/property.rb`

Добавить после `belongs_to :organization`:

```ruby
belongs_to :branch, optional: true
```

Добавить в блок валидаций:

```ruby
validate :branch_must_exist_in_org

private

def branch_must_exist_in_org
  return if branch_id.blank?
  return if branch.present? && branch.organization_id == organization_id

  errors.add(:branch, "must exist")
end
```

**Обоснования (Spec):**

- `optional: true` — `branch_id` nullable per Spec §3.1.
- **Custom validation — реальная cross-org защита.** Проверка
  `branch.organization_id == organization_id` **обязательна**:
  Rails `belongs_to :branch, optional: true` при чтении `branch`
  ищет запись глобально через `Branch.find(branch_id)`. Наивная
  проверка `branch.present?` **пропустит** foreign branch. Spec
  §7.1 явно предупреждает об этом, AC12b тестирует реальную
  защиту. См. §13 D4 Spec.
- Валидация `private` — как в F4 custom validations.

### 2.2. `Branch` — `has_many :properties` и переименование callback

**Изменение:** `backend/app/models/branch.rb`

Добавить после `has_many :children`:

```ruby
has_many :properties
```

Переименовать callback и расширить условие:

```ruby
# Было (F4):
# before_destroy :prevent_destroy_if_has_children
#
# def prevent_destroy_if_has_children
#   return unless children.exists?
#   errors.add(:base, "Branch has children and cannot be deleted")
#   throw(:abort)
# end

# Становится (F5):
before_destroy :prevent_destroy_if_has_dependents

def prevent_destroy_if_has_dependents
  return unless children.exists? || properties.exists?

  errors.add(:base, "Branch has dependents and cannot be deleted")
  throw(:abort)
end
```

**Обоснования (Spec):**

- `has_many :properties` — Spec §3.3, без `dependent:` (restrict
  реализуется через `before_destroy`).
- Переименование метода + условия + сообщения — единый шаг, Spec
  §7.2 + §13 D5. Сообщение «Branch has dependents and cannot be
  deleted» — Spec §5.4, покрывает оба случая (children, properties
  и их комбинацию).
- **F4 BranchesController не меняется** — рендеринг 409 через
  `errors.full_messages` уже работает.
- **F4 model spec обновляется в C2** — describe blocks
  переименовываются, literal message updated.

### 2.3. Acceptance §2

- `bin/rails runner 'Property.reflect_on_association(:branch).class'`
  возвращает `ActiveRecord::Reflection::BelongsToReflection`.
- `bin/rails runner 'Branch.reflect_on_association(:properties).class'`
  возвращает `ActiveRecord::Reflection::HasManyReflection`.
- `bundle exec rubocop app/models/property.rb app/models/branch.rb`
  — зелёный.
- Полная верификация — через C2 specs.

**Здесь делается коммит C1.**

---

## 3. Controller updates `PropertiesController`

**Изменение:**
`backend/app/controllers/api/v1/properties_controller.rb`

### 3.1. Добавить `branch_id` в `permit`

```ruby
def property_params
  params.require(:property).permit(:name, :address, :property_type, :description, :branch_id)
end
```

### 3.2. Обновить `create` и `update` с sentinel pattern F4

```ruby
def create
  authorize Property

  permitted = params.require(:property).permit(:name, :address, :property_type, :description, :branch_id)
  property_attrs = permitted.slice(:name, :address, :property_type, :description)

  property = Current.organization.properties.new(property_attrs)

  # ⚠️ SECURITY: branch resolved via scope, NOT passed as raw id.
  # See resolve_branch_or_error and Spec F5 §4.2 ANTI-PATTERN.
  if permitted.key?(:branch_id)
    branch_or_error = resolve_branch_or_error(permitted[:branch_id])
    if branch_or_error == :not_in_scope
      render json: { error: [ "Branch must exist" ] },
             status: :unprocessable_entity
      return
    end
    property.branch = branch_or_error
  end

  if property.save
    render json: property_json(property), status: :created
  else
    render json: { error: property.errors.full_messages }, status: :unprocessable_entity
  end
end

def update
  property = find_property
  return if performed?

  authorize property

  permitted = params.require(:property).permit(:name, :address, :property_type, :description, :branch_id)
  property.assign_attributes(permitted.slice(:name, :address, :property_type, :description))

  # ⚠️ SECURITY: same pattern as create — see resolve_branch_or_error.
  if params[:property].key?(:branch_id)
    branch_or_error = resolve_branch_or_error(permitted[:branch_id])
    if branch_or_error == :not_in_scope
      render json: { error: [ "Branch must exist" ] },
             status: :unprocessable_entity
      return
    end
    property.branch = branch_or_error
  end

  if property.save
    render json: property_json(property)
  else
    render json: { error: property.errors.full_messages }, status: :unprocessable_entity
  end
end
```

### 3.3. Добавить private `resolve_branch_or_error` helper

```ruby
private

# SECURITY: branch MUST be resolved via Current.organization scope.
# Passing branch_id directly into new/update would let Rails resolve
# it via global Branch.find (belongs_to :branch, optional: true),
# crossing organization boundaries. See Spec F5 §4.2.
#
# Returns nil (valid unlink), :not_in_scope (422 signal), or a
# Branch record from Current.organization.
def resolve_branch_or_error(raw_id)
  return nil if raw_id.blank?

  branch = Current.organization.branches.find_by(id: raw_id)
  branch || :not_in_scope
end
```

### 3.4. Обновить `property_json` helper

```ruby
def property_json(property)
  {
    id: property.id,
    organization_id: property.organization_id,
    branch_id: property.branch_id,
    name: property.name,
    address: property.address,
    property_type: property.property_type,
    description: property.description,
    created_at: property.created_at,
    updated_at: property.updated_at
  }
end
```

**Обоснования (Spec):**

- **Sentinel pattern F4 перенесён дословно** — F4 `BranchesController#resolve_parent_or_error`
  с `:not_in_scope`. Единственный security-корректный путь (Spec
  §4.2, Brief blocking invariant).
- **`params[:property].key?(:branch_id)`** — F4 pattern различия
  «не передан vs null vs integer» (Spec §5.2).
- **`property_attrs = permitted.slice(...)`** — явное разделение
  полей, которые идут в `.new`/`.assign_attributes`, и branch_id,
  который идёт через resolve. Никогда не передавать `branch_id`
  напрямую в `.new(branch_id: ...)` — ANTI-PATTERN (Spec §4.2).
- **`property_json` с `branch_id`** — Spec §6.1 новый ключ.
- **Другие экшены (`index`, `show`, `destroy`)** — не меняются,
  они используют `property_json`, который автоматически получает
  новый ключ.

**Acceptance §3:**

- `rubocop` зелёный.
- `bin/rails runner 'Api::V1::PropertiesController'` — грузится.
- Полная верификация — через C2 request spec updates.

---

## 4. F1 Property request spec updates

**Изменение:**
`backend/spec/requests/api/v1/properties_spec.rb`

### 4.1. Обновить ожидаемый массив ключей

Найти тест «returns JSON with exactly the documented set of keys»
(после F1 он был установлен явно). Обновить `expected_keys`:

```ruby
expected_keys = %w[id organization_id branch_id name address property_type description created_at updated_at]
```

Это единственное изменение существующего F1 теста — AC13
regression guard, Spec §6.1 и §10 AC13.

### 4.2. Добавить новые F5 тесты

В тот же файл `properties_spec.rb` (не создавать отдельный
`properties_branch_spec.rb` — F5 не отдельная фича, это расширение
F1).

Новые describe/context блоки:

```text
describe "POST /api/v1/properties with branch_id (F5)" do
  it "AC1 — creates property with valid branch_id → 201"
  it "E1 — creates property without branch_id → 201, branch_id: null in response"
  it "E2 — creates property with branch_id: null → 201"
  it "AC5 — returns 422 for cross-org branch_id (security)"
  it "E4 — returns 422 for non-existing branch_id"
end

describe "PATCH /api/v1/properties/:id with branch_id (F5)" do
  it "AC2 — updates branch_id to another valid branch → 200"
  it "AC3 — unlinks branch via {branch_id: null} → 200"
  it "AC4a — branch_id preserved when key absent (integer)"
  it "AC4b — branch_id preserved when key absent (null)"
  it "AC6 — returns 422 for cross-org branch_id, mine.branch_id unchanged"
  it "E9 — returns 422 for non-existing branch_id"
end

describe "GET /api/v1/properties/:id (F5 JSON contract update)" do
  it "AC7 — response includes branch_id key (null for unlinked)"
  it "AC7 — response includes branch_id key (integer for linked)"
end

describe "AC15 — nullable invariant (F5)" do
  it "Property without branch_id created and queried without errors"
end
```

Итого ~14 новых тестов.

### 4.3. Добавить model spec для `branch_must_exist_in_org`

**Файл:** `backend/spec/models/property_spec.rb` — **может не
существовать**. Если не существует, создать минимальный с двумя
тестами (AC12a, AC12b):

```text
RSpec.describe Property, type: :model do
  describe "branch_must_exist_in_org validation (F5)" do
    it "AC12a — is invalid when branch_id is non-existing"
    it "AC12b — is invalid when branch_id belongs to another org (cross-org)"
  end
end
```

Grounding §0 подтвердил: **файл не существует**, создаётся с нуля
с `require "rails_helper"` и минимальным describe-блоком (два теста
AC12a и AC12b).

**Acceptance §4:**

- `bundle exec rspec spec/requests/api/v1/properties_spec.rb
  spec/models/property_spec.rb` — зелёный.
- F1 существующие тесты (кроме одного обновлённого expected_keys)
  — зелёные, 0 changes в их логике.

---

## 5. F4 Branch spec updates

### 5.1. `branches_spec.rb` — обновить AC6 сообщение

**Изменение:**
`backend/spec/requests/api/v1/branches_spec.rb`

Найти тест AC6 «returns 409 with exact Spec §5.5 message when
children exist». Обновить literal сообщение:

```ruby
expect(response.parsed_body["error"]).to eq([ "Branch has dependents and cannot be deleted" ])
```

### 5.2. Добавить новые F5 тесты для DELETE branch с properties

В тот же файл, в describe `DELETE /api/v1/branches/:id`:

```text
it "AC9 — returns 409 when branch has properties"
it "AC11 — returns 409 when branch has children AND properties (single message)"
```

AC10 уже покрыт обновлённым AC6 с новым сообщением.

### 5.3. `branch_spec.rb` — переименование describe и обновление сообщения

**Изменение:**
`backend/spec/models/branch_spec.rb`

Переименовать describe:

```ruby
# Было:
describe "before_destroy :prevent_destroy_if_has_children" do

# Становится:
describe "before_destroy :prevent_destroy_if_has_dependents" do
```

Обновить тест «populates errors[:base] with exact Spec §5.5
message»:

```ruby
expect(parent.errors[:base]).to include("Branch has dependents and cannot be deleted")
```

Добавить новый тест для properties case (чтобы F5 branch spec
покрывал обе ветки OR условия):

```ruby
it "returns false on destroy when properties exist (F5)"
it "populates errors[:base] with same message when properties exist"
```

**Acceptance §5:**

- `rspec spec/requests/api/v1/branches_spec.rb spec/models/branch_spec.rb`
  — зелёный.
- F4 регрессия 0.

**Здесь делается коммит C2** (implementation + regression
updates + new F5 tests).

---

## 6. Coverage ratchet + retrospective Spec patches

### 6.1. Ratchet bump

**Изменение:** `backend/spec/spec_helper.rb`

После полного `rspec` прогона записать actual coverage. Обновить:

```ruby
minimum_coverage line: <floor(actual) - 1>
```

Target: 80%. Ожидаемое actual — 75–77% (F5 сама прибавит 3–5pp).
Если < 79 → смотри §8 C4 hw-0 tests.

### 6.2. Ретроспективный patch F1 Spec

**Изменение:**
`homeworks/hw-1/features/01-property-crud/spec.md`

Два места:

- **§6 JSON** — добавить ключ `branch_id`:

  ```json
  {
    "id": 17,
    "organization_id": 42,
    "branch_id": null,
    "name": "...",
    ...
  }
  ```

- **AC9 «Стабильный JSON-контракт»** — обновить массив ключей
  (найти «set of keys» или аналог), добавить `branch_id`.

Дописать в конец **§13** (Открытые вопросы / Решения) F1 Spec
ноту:

> **F5 retrospective update (2026-04-09):** поле `branch_id`
> добавлено Spec F5. F1 JSON-контракт расширен одним nullable
> ключом. F5 Spec §13 D2 — решение «F5 owns retrospective patches».

### 6.3. Ретроспективный patch F4 Spec

**Изменение:**
`homeworks/hw-1/features/04-branches/spec.md`

Три места:

- **§5.5 DELETE /branches/:id** — обновить сообщение 409 тела:

  ```json
  { "error": ["Branch has dependents and cannot be deleted"] }
  ```

- **§3.5.5 инвариант restrict** — расширить условие:
  «ни хотя бы один дочерний `children` **ни хотя бы один привязанный
  Property**»; обновить сообщение в описании `before_destroy`.

- **§7.2 таблица + код callback** — обновить имя метода на
  `prevent_destroy_if_has_dependents`, условие на `children.exists?
  || properties.exists?`, сообщение «Branch has dependents...».

- **AC6** — обновить тест-описание с «children» на «dependents».

- Добавить в конец §13 F4 ноту:

  > **F5 retrospective update (2026-04-09):** `before_destroy`
  > callback расширен проверкой `properties.exists?`, сообщение
  > унифицировано на «Branch has dependents and cannot be deleted».
  > F5 Spec §13 D5 — F5 owns retrospective patches.

### 6.4. `ai-docs/PLAN.md`

Отметить как `[x]`:

- `1.4.5` Frontend — **не** отмечается (F5 не делает frontend).

F5 не добавляет новых пунктов в PLAN.md — в существующих пунктах
Phase 1.4 остаются только frontend позиции (1.4.5), которые не в
scope HW-1.

### 6.5. `ai-docs/SCHEMA.md`

- Блок **Property** (Phase 2) — добавить строку `branch_id` в таблицу
  полей, добавить `belongs_to :branch (optional)` в Associations,
  добавить `[branch_id]` в Indexes.
- Блок **Branch** (Phase 1) — добавить `has_many :properties` в
  Associations. Обновить note про `before_destroy` — с «when
  children.exists?» на «when children.exists? || properties.exists?
  (F5)».

### 6.6. `ai-docs/DECISIONS.md` — опциональное DEC-015

Spec F5 §13 D2 говорит «DEC-015 опционально — Spec решает при C3».

Решение: **добавить** DEC-015 про «F5 owns retrospective patches»
как первую фичу, устанавливающую SDD precedent.

```markdown
## DEC-015: Cross-cutting features own retrospective spec patches (2026-04-09)

**Решение:** Когда фича меняет контракт ранее зафиксированной
активной фичи (JSON, сообщения ошибок, public API), **новая фича
владеет patchем**: обновляет текст старого Spec-документа
ретроспективно и помечает изменение в C-блоке docs sync.

**Альтернатива:** новая фича `owns override`, старый Spec остаётся
как был, читатель должен знать цепочку `F1 + F5 override`.

**Причина выбора:**

- Чистота актуального состояния важнее исторической immutability.
  Читатель F1 Spec видит актуальный JSON-контракт, без необходимости
  искать F5 и накладывать diff в голове.
- Консистентно с `ai-docs/SCHEMA.md` и `ai-docs/PLAN.md`, которые
  редактируются непрерывно по мере роста кода.
- Альтернатива `owns override` создаёт разветвлённую ответственность:
  каждый новый читатель Spec'а должен знать, какие «override» фичи
  существуют. Это не масштабируется.

**Процедура:**

1. Новая фича явно перечисляет затрагиваемые Spec'и в своём §13.
2. C-блок docs sync включает patch файлов старых Spec'ов.
3. Патч сопровождается inline-нотой в старом Spec'е
   «F<N> retrospective update (<date>): ...».

**Влияние:** HW-1 F5 применяет первым. HW-2+ следуют.
```

### 6.7. `homeworks/hw-1/report.md`

- Заполнить блок «05 — Property ↔ Branch link».
- Обновить строку F5 в сводной таблице.
- Coverage ratchet финальная строка: `После F5 (финал HW-1) | 79
  | 80.x% | финальная цель достигнута`.
- Финальные выводы по HW-1: что получилось, что нет, уроки.
- Опционально — адаптированные промпты PROMPTS.md v2 переносятся
  (см. §6.8).

### 6.8. `CLAUDE.md` — удалить HW-1 секцию

CLAUDE.md в текущем виде содержит секцию «Active homework — HW-1»
с инструкциями про `WORKING_AGREEMENTS.md`. **После завершения F5**
этот блок удаляется (per CLAUDE.md own instruction «Remove this
section from CLAUDE.md when HW-1 is submitted»).

Это делается **только** если F5 действительно закрывает HW-1, т.е.
coverage >= 80 и все AC1–AC15 зелёные. Иначе CLAUDE.md trogayeat в
финальном PR hw-1 → main, не в C3.

### 6.9. `homeworks/hw-1/PROMPTS.md` — адаптированные промпты v2

По накопленному опыту F3/F4/F5 перенести кандидаты в v2 раздел:

- **Spec review v2 (Apartus-specific):**
  - «Для каждого зафиксированного решения (D-entry) прогнать поиск
    потенциальных следствий по всему документу — упоминания старого
    варианта в AC, E-сценариях, §4.7 порядке, JSON-контрактах» (F3
    урок).
  - «Если Spec требует кастомное сообщение на destroy — НЕ
    использовать `dependent: :restrict_with_error`, использовать
    `before_destroy` callback с явным сообщением» (F3 R1, F4 B1).
  - «Для security-critical инвариантов — требовать ANTI-PATTERN
    warning блок с конкретным запрещённым кодом, не только
    позитивную формулировку» (F4 B3).
  - «Для custom validations, защищающих cross-org isolation —
    проверять `organization_id` match, не просто `present?`
    ассоциации; `belongs_to optional: true` резолвит id
    глобально» (F5 B4).

- **Plan review v2:**
  - «Для каждого нового кода статуса (не 200/201/204/400/401/403/404/422)
    указать механизм его получения в controller и как это
    тестируется» (F3 409, F4 409).
  - «Для каждой cross-cutting фичи явно перечислить затрагиваемые
    Spec-документы и процедуру их обновления» (F5).

Решение: перенести все шесть пунктов в PROMPTS.md v2 раздел.

**Acceptance docs sync §6:**

- `grep -n 'branch_id' homeworks/hw-1/features/01-property-crud/spec.md` → присутствует (retrospective patch).
- `grep -n 'dependents' homeworks/hw-1/features/04-branches/spec.md` → присутствует (retrospective patch).
- `grep -n '#### Property' ai-docs/SCHEMA.md` → блок содержит `branch_id`.
- `grep -n 'DEC-015' ai-docs/DECISIONS.md` → присутствует.
- `homeworks/hw-1/report.md` — строка F5 заполнена.
- `CLAUDE.md` — HW-1 секция удалена (если coverage ≥ 80).
- **Markdownlint:** `npx --yes markdownlint-cli2 "**/*.md"` — 0 errors.

**Здесь делается коммит C3** (docs sync + retrospective patches).

---

## 7. Verify после C3

```bash
cd backend
bundle exec rubocop
bundle exec rspec
```

- 0 failures.
- Line coverage записать.
- Если >= 80 → HW-1 complete, переход к §9 finalization.
- Если 79 <= actual < 80 → §8 minimum hw-0 tests.
- Если < 79 → §8 полноценные hw-0 tests.

---

## 8. (Conditional) C4 — hw-0 tests для coverage 80%

Этот шаг выполняется, **только** если C3 не даёт 80%. Процедура
Spec §13 D8:

### 8.1. Измерить актуальное покрытие

```bash
bundle exec rspec 2>&1 | grep "Line Coverage"
```

Записать число.

### 8.2. Определить приоритетные hw-0 файлы

Открыть `coverage/index.html` (SimpleCov HTML report), найти файлы
с самым низким % покрытия. Приоритет:

1. `app/controllers/api/v1/auth/sessions_controller.rb` — auth
   flow (sign_in, refresh, sign_out, show).
2. `app/controllers/api/v1/auth/registrations_controller.rb` —
   sign_up.
3. `app/controllers/api/v1/members_controller.rb` — membership CRUD.
4. `app/controllers/api/v1/roles_controller.rb` — роли (уже частично
   покрыто).
5. `app/models/user.rb`, `app/models/organization.rb` — модели.

Выбрать минимальный набор файлов, чтобы добавить покрытия до 80%
(обычно 2–3 файла достаточно).

### 8.3. Написать request specs

Для каждого выбранного controller:

```text
RSpec.describe "Api::V1::Auth::Sessions" do
  describe "POST /api/v1/auth/sign_in" do
    it "returns 200 with token for valid credentials"
    it "returns 401 for invalid credentials"
  end

  describe "DELETE /api/v1/auth/sign_out" do
    it "returns 204 and revokes token"
  end

  describe "GET /api/v1/auth/me" do
    it "returns current user info"
  end

  describe "POST /api/v1/auth/refresh" do
    it "returns new access token with valid refresh token"
    it "returns 401 with invalid refresh token"
  end
end
```

Цель — **минимум для 80%**, не полное покрытие. 10–15 новых тестов.

### 8.4. Acceptance §8

- `rspec` зелёный с coverage ≥ 80.
- Ratchet bump до `floor(actual) - 1` (обычно 79).

**Здесь делается коммит C4** (только если был нужен).

---

## 9. Финализация HW-1

После всех коммитов (C1 + C2 + C3 + [C4]):

```bash
cd backend
bundle exec rubocop
bundle exec rspec
npx --yes markdownlint-cli2 "**/*.md"
```

Все зелёные. Coverage ≥ 80.

```bash
git push origin hw-1
```

Issue #5 — comment со ссылками brief/spec/plan/коммиты.

### 9.1. Финальный PR hw-1 → main

После F5 — финальный merge:

1. Создать PR `hw-1 → main` (новый, полноценный; Draft PR #6 —
   закрыть без мержа после создания финального PR, как устаревший
   контейнер).
2. Описание PR: summary всех 5 фич + coverage journey 38 → 54 → 60
   → 67 → 71 → 80.
3. **В описании PR — явно `Closes #10, Closes #11, Closes #3,
   Closes #4, Closes #5, Closes #1`** — чтобы GitHub автоматически
   закрыл все issues HW-1 (фичи #10/#11/#3/#4/#5 и зонтик #1) при
   мерже.
4. Ссылки на DEC-012, DEC-013, DEC-014, DEC-015 в описании.
5. Проверить CI зелёный.
6. Merge (без squash, чтобы сохранить fine-grained историю).

### 9.2. Issue #1 (HW-1 зонтик) — закрыть

После merge hw-1 → main:

- Добавить финальный comment с coverage journey и ссылками.
- Close issue #1.

Это вне scope F5 Plan (делается после merge), но здесь отмечено как
последний шаг HW-1.

---

## 10. Зависимости, предусловия, ограничения

- Все §12 Spec зависимости проверены grounding'ом §0.
- **Никаких новых gems.**
- Миграция одна (`add_branch_to_properties`), существующие не
  трогаем.
- **Меняется общий код F1 model/controller и F4 model** — это
  единственный случай в HW-1 (D5).
- **Меняются тексты F1 и F4 Spec-документов** — ретроспективные
  patches (D2).
- F2, F3 код и Spec'ы не трогаем (AC13 regression guard).

## 11. Открытые вопросы Plan

_(Нет. Spec полностью покрывает F5, включая custom validation
реальной cross-org защиты, message coordination, retrospective
patches, coverage procedure, C2 vs C3 level separation.)_

## 12. Что НЕ делать в F5

- Не вводить новой сущности или эндпоинта.
- Не передавать `branch_id` напрямую в `.new`/`.update` без
  resolve через scope (Spec §4.2 ANTI-PATTERN).
- Не добавлять новых permission-кодов.
- Не обновлять F2 / F3 код или Spec'и.
- Не трогать F1 / F4 код без прямой необходимости (только
  `properties.rb`, `properties_controller.rb`, `property.rb`,
  `branch.rb`, `properties_spec.rb`, `branches_spec.rb`,
  `branch_spec.rb`, и Spec-файлы F1/F4).
- Не делать F1 `parent_branch_must_exist_in_org` fix в F4 — это
  отдельный hotfix, вне scope F5.
- Не удалять hw-0 код при добавлении hw-0 тестов (§8).
- Не делать финальный `hw-1 → main` PR внутри F5 Plan — это
  послеммитный шаг §9.1, делается вручную.
