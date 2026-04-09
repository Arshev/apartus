---
name: F4 Plan — Branches (self-referential tree)
status: active
related_issue: "#4"
umbrella_issue: "#1"
spec: ./spec.md
brief: ./brief.md
feature: 04-branches
---

# Plan — Branches (self-referential tree)

> Пошаговый план реализации Spec [./spec.md](./spec.md). Форма
> повторяет F1–F3; отличия F4 — self-referential FK, custom Ruby
> валидации (self-ref, cycle, parent_must_exist_in_org), ANTI-PATTERN
> warning для security, 409 через `before_destroy` (F3 R1 урок),
> частичный уникальный индекс с nil-parent handling.

## 0. Группировка коммитов

**Риск D1 ratchet практически гарантирован** — F4 добавит ~180 строк
production (модель с custom-валидациями + контроллер с security-aware
логикой + policy + permissions + migration). Ratchet floor 67 после
F3. Процедура из F2/F3: прогнать локально перед C2, при падении —
склеить C2+C3.

| # | Группа | Файлы | Шаги |
|---|---|---|---|
| C1 | Migration + model + Permissions + Organization assoc | миграция, `app/models/branch.rb`, изменения `app/models/organization.rb`, `app/models/concerns/permissions.rb` | §1, §2 |
| C2 | Controller + policy + routes | `app/controllers/api/v1/branches_controller.rb`, `app/policies/branch_policy.rb`, `config/routes.rb` | §3, §4, §5 |
| C3 | Factory + specs (request + model) | `spec/factories/branches.rb`, `spec/models/branch_spec.rb`, `spec/requests/api/v1/branches_spec.rb` | §6 |
| C4 | Coverage ratchet + docs sync + DEC-014 | `backend/spec/spec_helper.rb`, `ai-docs/PLAN.md`, `ai-docs/SCHEMA.md`, `ai-docs/DECISIONS.md`, `homeworks/hw-1/report.md` | §7, §8 |

**Порядок внутри C2:** policy → controller → routes (избегает
`uninitialized constant` при случайном прогоне между шагами, F2/F3
паттерн).

**Grounding §0** (проверено при написании Plan):

- `backend/config/routes.rb` — после F3 содержит `resources
  :properties do resources :units`, flat `resources :amenities`,
  `resources :units, only: [] do resources :amenities, controller:
  "unit_amenities"`. F4 добавляет **flat** `resources :branches`,
  nested endpoints не нужны (§13 D4 Spec — flat list).
- `backend/app/models/concerns/permissions.rb` — после F3 содержит
  `amenities.view/manage`. F4 добавляет `branches.view/manage` в
  `ALL_PERMISSIONS` и в `PRESET_ROLES[:manager/:viewer]`.
- `backend/app/models/organization.rb` — после F3 содержит `has_many
  :properties/:units/:amenities`. F4 добавляет `has_many :branches,
  dependent: :destroy`.
- `backend/spec/factories/` — `branches.rb` **отсутствует**, создаётся
  с нуля.
- Ratchet floor: `minimum_coverage line: 67` (F3 post-bump).

---

## 1. Миграция `create_branches`

**Файл (новый):** `backend/db/migrate/<ts>_create_branches.rb`

```ruby
class CreateBranches < ActiveRecord::Migration[8.1]
  def change
    create_table :branches do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.references :parent_branch,
                   null: true,
                   foreign_key: { to_table: :branches, on_delete: :restrict }
      t.string :name, null: false, limit: 100

      t.timestamps
    end

    # Uniqueness per (org, parent, LOWER(name)) — two partial indexes
    # to handle NULL parent correctly (PG treats NULL != NULL).
    add_index :branches,
              "organization_id, parent_branch_id, LOWER(name)",
              unique: true,
              where: "parent_branch_id IS NOT NULL",
              name: "index_branches_on_org_parent_lower_name"

    add_index :branches,
              "organization_id, LOWER(name)",
              unique: true,
              where: "parent_branch_id IS NULL",
              name: "index_branches_on_org_lower_name_root"
  end
end
```

**Обоснования (Spec):**

- `t.references :parent_branch, foreign_key: { to_table: :branches,
  on_delete: :restrict }` — self-referential FK (§3.1, §3.3). `null:
  true` для корневых. `RESTRICT` — DB-уровневая защита §3.5.5 b)
  (основная защита — `before_destroy` §2.1).
- **Два partial indexes** вместо одного с `COALESCE` — чище, явнее.
  PostgreSQL трактует `NULL != NULL` в unique constraints, поэтому
  для nil-parent нужен отдельный индекс с `WHERE parent_branch_id IS
  NULL`. Rails uniqueness-валидация (§7.1) сама корректно работает с
  nil (основная защита), DB-индексы — защита от race.
- `limit: 100` на `name` — §3.1, §7.1.
- `t.references` создаёт обычный индекс на `parent_branch_id` —
  пригодится для поиска детей и обхода циклов.

**Fallback:** если Rails 8 `add_index` со string-expression +
`where:` выдаст синтаксическую ошибку — использовать `execute`:

```ruby
execute <<~SQL.squish
  CREATE UNIQUE INDEX index_branches_on_org_parent_lower_name
  ON branches (organization_id, parent_branch_id, LOWER(name))
  WHERE parent_branch_id IS NOT NULL
SQL
```

Проверить string-form первой (F3 C1 show'ed Rails 8 handles it).

**Команды:**

```bash
cd backend
bin/rails g migration CreateBranches organization:references parent_branch:references name:string
# Привести к виду выше (null: true на parent_branch, limit, FK options, два partial indexes).
bin/rails db:migrate
bin/rails db:migrate RAILS_ENV=test
```

**Acceptance шага:**

- `db/schema.rb` содержит `branches` с FK на `organizations`
  (cascade) и self-FK на `branches` (restrict, nullable), оба
  partial unique indexes.
- `bin/rails db:migrate:status` → `up` в **dev** окружении.
- `bin/rails db:migrate:status RAILS_ENV=test` → `up` в **test**
  окружении. Обязательно: без этого `rspec` в §6 не сможет создавать
  `branches` записи и упадёт на первом же model spec.

---

## 2. Модель Branch + Organization + Permissions

### 2.1. `Branch`

**Файл (новый):** `backend/app/models/branch.rb`

```ruby
class Branch < ApplicationRecord
  belongs_to :organization
  belongs_to :parent_branch, class_name: "Branch", optional: true
  has_many :children,
           class_name: "Branch",
           foreign_key: :parent_branch_id
  # NOTE: intentionally no `dependent:` — deletion guard is done via
  # before_destroy below for custom error message (F3 R1 lesson).

  normalizes :name, with: ->(v) { v.to_s.strip }

  validates :name,
            presence: true,
            length: { maximum: 100 },
            uniqueness: { case_sensitive: false,
                          scope: [ :organization_id, :parent_branch_id ] }

  validate :parent_branch_must_exist_in_org
  validate :parent_is_not_self
  validate :parent_is_not_descendant, on: :update

  before_destroy :prevent_destroy_if_has_children

  private

  def parent_branch_must_exist_in_org
    return if parent_branch_id.blank?
    return if parent_branch.present?

    errors.add(:parent_branch, "must exist")
  end

  def parent_is_not_self
    return if parent_branch_id.blank?
    return if id.blank? || parent_branch_id != id

    errors.add(:parent_branch, "cannot be self")
  end

  def parent_is_not_descendant
    return if parent_branch_id.blank?
    return unless parent_branch

    current = parent_branch
    while current
      if current.id == id
        errors.add(:parent_branch, "cannot be a descendant")
        return
      end
      current = current.parent_branch
    end
  end

  def prevent_destroy_if_has_children
    return unless children.exists?

    errors.add(:base, "Branch has children and cannot be deleted")
    throw(:abort)
  end
end
```

**Обоснования (Spec):**

- `has_many :children` **без** `dependent: :restrict_with_error` —
  F3 R1 урок: Rails default message несовместимо со Spec §5.5.
  Защита через `before_destroy` (§3.5.5 a).
- `belongs_to :parent_branch, optional: true` — nil parent для
  корневых. Custom-валидация `parent_branch_must_exist_in_org`
  закрывает дыру Spec §7.1 (optional не проверяет existence).
- `normalizes :name` — §3.2.
- `uniqueness: { case_sensitive: false, scope: [:organization_id,
  :parent_branch_id] }` — Rails корректно обрабатывает nil-parent
  как scope value (§3.2, §7.1).
- `parent_is_not_self` — guard `id.blank?` для create (id ещё нет) +
  `parent_branch_id != id` check. `on:` не указан → работает на обоих
  create и update.
- `parent_is_not_descendant, on: :update` — обход вверх через
  `parent_branch`, только на update (на create новый branch не может
  быть в чьих-то descendants — он ещё не существует).
- `before_destroy` — F3 Amenity pattern, точное Spec-сообщение §5.5.

### 2.2. Обновление существующих

**`backend/app/models/organization.rb`** — добавить после `has_many
:amenities`:

```ruby
has_many :branches, dependent: :destroy
```

**`backend/app/models/concerns/permissions.rb`** — добавить
`branches.view/manage`:

```ruby
ALL_PERMISSIONS = [
  # ... existing ...
  "amenities.manage",
  "amenities.view",
  "branches.manage",
  "branches.view",
  # ... existing ...
].freeze
```

В `PRESET_ROLES[:manager][:permissions]` добавить `branches.manage
branches.view`. В `PRESET_ROLES[:viewer][:permissions]` добавить
`branches.view`. `admin` получает автоматически через
`ALL_PERMISSIONS`.

### 2.3. Acceptance

- `bin/rails runner 'Branch.new.tap(&:valid?).errors.full_messages'`
  → ошибки на `name`, `organization`.
- `bin/rails runner 'puts Permissions::ALL_PERMISSIONS.include?("branches.manage")'`
  → `true`.
- `bin/rails runner 'puts Permissions::PRESET_ROLES[:manager][:permissions].include?("branches.manage")'`
  → `true`.
- `bin/rails runner 'puts Permissions::PRESET_ROLES[:viewer][:permissions].include?("branches.view")'`
  → `true`.
- Custom validations автоматизируются в model spec §6.2.

**Здесь делается коммит C1.**

---

## 3. Policy `BranchPolicy`

**Файл (новый):** `backend/app/policies/branch_policy.rb`

```ruby
class BranchPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("branches.view")
  end

  def show?
    Current.membership&.can?("branches.view")
  end

  def create?
    Current.membership&.can?("branches.manage")
  end

  def update?
    Current.membership&.can?("branches.manage")
  end

  def destroy?
    Current.membership&.can?("branches.manage")
  end
end
```

Форма 1:1 с `PropertyPolicy` / `UnitPolicy` / `AmenityPolicy`.
Reference pattern F1.

**Acceptance:**

- `rubocop` зелёный.
- `bin/rails runner 'BranchPolicy.new(nil, nil)'` — грузится.
- Реальная верификация — через request spec §6 (AC8/AC9/AC14).

---

## 4. Контроллер `Api::V1::BranchesController`

**Файл (новый):**
`backend/app/controllers/api/v1/branches_controller.rb`

```ruby
module Api
  module V1
    class BranchesController < BaseController
      def index
        authorize Branch
        branches = Current.organization.branches.order(:id)
        render json: branches.map { |b| branch_json(b) }
      end

      def show
        branch = find_branch
        return if performed?

        authorize branch
        render json: branch_json(branch)
      end

      def create
        authorize Branch

        permitted = params.require(:branch).permit(:name, :parent_branch_id)
        parent = resolve_parent(permitted[:parent_branch_id])

        branch = Current.organization.branches.new(name: permitted[:name], parent_branch: parent)
        if branch.save
          render json: branch_json(branch), status: :created
        else
          render json: { error: branch.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        branch = find_branch
        return if performed?

        authorize branch

        permitted = params.require(:branch).permit(:name, :parent_branch_id)
        attrs = {}
        attrs[:name] = permitted[:name] if permitted.key?(:name)
        if params[:branch].key?(:parent_branch_id)
          attrs[:parent_branch] = resolve_parent(permitted[:parent_branch_id])
        end

        if branch.update(attrs)
          render json: branch_json(branch)
        else
          render json: { error: branch.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        branch = find_branch
        return if performed?

        authorize branch

        if branch.destroy
          head :no_content
        else
          render json: { error: branch.errors.full_messages }, status: :conflict
        end
      end

      private

      def find_branch
        branch = Current.organization.branches.find_by(id: params[:id])
        unless branch
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        branch
      end

      # ⚠️ SECURITY: parent MUST be resolved via Current.organization scope.
      # Passing parent_branch_id directly into new/update would let Rails
      # resolve it via global Branch.find, crossing organizations.
      # See Spec §5.3 ANTI-PATTERN block.
      def resolve_parent(raw_id)
        return nil if raw_id.blank?

        Current.organization.branches.find_by(id: raw_id)
        # nil result → custom validation parent_branch_must_exist_in_org → 422
      end

      def branch_json(branch)
        {
          id: branch.id,
          organization_id: branch.organization_id,
          parent_branch_id: branch.parent_branch_id,
          name: branch.name,
          created_at: branch.created_at,
          updated_at: branch.updated_at
        }
      end
    end
  end
end
```

**Обоснования (Spec):**

- **Security invariant §3.5.8 (Brief блокирующий):** `resolve_parent`
  — единственный путь к `parent_branch` в контроллере; всегда через
  `Current.organization.branches.find_by`. Комментарий в коде прямо
  ссылается на Spec §5.3 ANTI-PATTERN.
- **Update c разделением трёх случаев (§5.4):**
  `params[:branch].key?(:parent_branch_id)` — различает «не передан»
  и «передан как null» (Plan уровень, Spec §5.4 m3).
- **Create validation order (§4.7):** `permit` → resolve parent →
  `new` с объектом → `save` запускает custom-валидации (включая
  `parent_branch_must_exist_in_org` → 422 для nil-parent при
  непустом raw_id).
- **Destroy через `if branch.destroy`** (Spec §5.5, F3 pattern):
  `before_destroy` возвращает `false` → 409 с точным сообщением.
- **`authorize branch`** (instance) для show/update/destroy — F1
  reference pattern. `authorize Branch` (class) для index/create.
- **`branch_json` явно перечисляет поля** — §6.1 AC13. Без
  `parent_branch`, `children`, `ancestors`, `descendants`.
- **`organization_id` не в permitted** — иммутабельность AC12.
- **`if .save` / `if .update`** — единообразно с F1/F2/F3.

**Acceptance:**

- `rubocop` зелёный.
- `bin/rails runner 'Api::V1::BranchesController'` — грузится.
- Реальная верификация — request spec §6.

---

## 5. Routes

**Изменение:** `backend/config/routes.rb`

Добавить flat `resources :branches` рядом с `resources :amenities`
(после F3 блока, перед `get "health"`):

```ruby
resources :branches, only: [ :index, :show, :create, :update, :destroy ]
```

**Обоснования:**

- Flat CRUD — Spec §5, без nested вариантов (§13 D4 — нет
  ancestors/descendants endpoints).
- Форма 1:1 с `resources :amenities` F3, reference pattern.

**Acceptance:**

- `bin/rails routes -g branches` → 5 маршрутов
  (`branches#index/show/create/update/destroy`).
- Существующие маршруты F1–F3 не изменены.

**Здесь делается коммит C2** (или C2+C3 при D1 fallback).

---

## 6. Factory и specs

### 6.1. Factory

**Файл (новый):** `backend/spec/factories/branches.rb`

```ruby
FactoryBot.define do
  factory :branch do
    organization
    sequence(:name) { |n| "Branch #{n}" }
  end
end
```

- Корневой по умолчанию (без parent_branch).
- Дочерние создаются явной передачей: `create(:branch, organization:
  org, parent_branch: parent)`. Важно, чтобы `organization` и
  `parent_branch` были одной org — иначе кастом-валидация упадёт.

**Acceptance:** транзитивно через model spec §6.2.

### 6.2. Model spec

**Файл (новый):** `backend/spec/models/branch_spec.rb`

Тесты:

```text
RSpec.describe Branch, type: :model do
  describe "uniqueness per (org, parent, case-insensitive name)" do
    it "rejects duplicate case-insensitive name under same parent"
    it "allows same name under different parents"
    it "rejects two roots with same name in same org"
    it "allows same root name in different orgs"
  end

  describe "normalization" do
    it "strips leading/trailing whitespace in name"
  end

  describe "parent_branch_must_exist_in_org validation" do
    it "is valid when parent_branch_id is nil (root)"
    it "is valid when parent_branch belongs to same org"
    it "is invalid when parent_branch_id set but not found"
  end

  describe "parent_is_not_self validation" do
    it "rejects parent_branch_id == id on update"
  end

  describe "parent_is_not_descendant validation (cycle)" do
    it "rejects setting parent to a direct child"
    it "rejects setting parent to a deep descendant"
    it "allows setting parent to unrelated branch"
    it "allows moving to root (parent_branch_id: nil)"
  end

  describe "before_destroy :prevent_destroy_if_has_children" do
    it "allows destroy of leaf branch"
    it "returns false on destroy when children exist"
    it "populates errors[:base] with exact Spec §5.5 message"
  end
end
```

**Acceptance шага 6.2:** `bundle exec rspec spec/models/branch_spec.rb`
зелёный — все 7 describe-блоков (≈16 тестов) проходят без ошибок.
Model spec не требует controller/routes и может запускаться отдельно
после C1, если C2 ещё не реализован.

### 6.3. Request spec

**Файл (новый):** `backend/spec/requests/api/v1/branches_spec.rb`

Структура — форма F3 `amenities_spec.rb`, адаптированная под tree:

```text
RSpec.describe "Api::V1::Branches" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth token" do
    it "returns 401 for index/show/create/update/destroy"            # AC10
  end

  describe "without X-Organization-Id" do
    it "returns 422 on GET index"                                    # AC11
  end

  describe "GET /api/v1/branches" do
    it "returns [] for empty org"                                    # AC1
    it "returns branches sorted by id"                               # AC1
    it "does NOT emit N+1 queries (single SELECT FROM branches)"     # AC15
  end

  describe "GET /api/v1/branches/:id" do
    it "returns branch with all keys"                                # AC13
    it "returns parent_branch_id as null for root"                   # AC13
    it "returns 404 for non-existing id"                             # E6
  end

  describe "POST /api/v1/branches" do
    it "creates root branch and returns 201"                         # AC1, E17
    it "creates child branch with parent_branch_id"                  # AC1
    it "trims whitespace in name"                                    # §3.2
    it "ignores organization_id in body"                             # AC12, E14
    it "returns 422 when name blank"                                 # E7
    it "returns 422 when name too long"                              # E8
    it "returns 422 when case-insensitive duplicate under same parent" # E9
    it "returns 201 when same name under different parent"           # E10
    it "returns 422 when two roots with same name in same org"       # E11
    it "returns 201 when same root name in different orgs"           # E12
    it "returns 400 when 'branch' key missing"                       # E13
    it "returns 422 with 'Parent branch must exist' for non-existing parent" # E15
    it "returns 422 with 'Parent branch must exist' for foreign-org parent"  # E16, AC5a
  end

  describe "PATCH /api/v1/branches/:id" do
    it "updates name only (no-op on parent)"                         # AC1b, E22
    it "moves child up one level (AC2a)"                             # AC2a
    it "moves back down (AC2b)"                                      # AC2b
    it "moves root to child of another root (AC2c)"                  # AC2c
    it "moves child to root via parent_branch_id: null (AC2d)"       # AC2d
    it "atomically updates name and parent_branch_id (AC2e)"         # AC2e
    it "rejects parent_branch_id == self.id with 422"                # AC3, E19
    it "rejects cycle (new parent is descendant) with 422"           # AC4, E20
    it "ignores organization_id in body"                             # AC12, E23
    it "returns 422 for foreign-org parent (AC5b)"                   # AC5b, E21
    it "returns 404 for foreign-org :id (AC5d)"                      # AC5d
    it "returns 400 on empty wrapper {branch: {}} (E22b)"            # E22b
    it "returns 400 on missing 'branch' key (E22c)"                  # E22c
  end

  describe "DELETE /api/v1/branches/:id" do
    it "deletes leaf branch → 204"                                   # AC1, E24
    it "returns 409 with exact Spec §5.5 message when children exist" # AC6, E25
    it "returns 404 for non-existing id"                             # E26
    it "returns 404 for foreign-org :id (AC5e)"                      # AC5e, E27
  end

  context "AC7 uniqueness split" do
    it "rejects duplicate case-insensitive under same parent"         # AC7a
    it "allows same name under different parents"                     # AC7b
    it "rejects two roots with same name in same org"                 # AC7c
    it "allows same root name in different orgs"                      # AC7d
  end

  context "AC3 — self-reference via PATCH" do
    it "returns 422 and does not modify parent_branch_id"             # AC3
  end

  context "AC5 security isolation (cross-org)" do
    it "POST with foreign parent_branch_id → 422 (AC5a)"
    it "PATCH with foreign parent_branch_id → 422 (AC5b)"
    it "GET foreign branch → 404 (AC5c)"
    it "PATCH foreign branch → 404 (AC5d)"
    it "DELETE foreign branch → 404 (AC5e)"
  end

  context "as viewer (branches.view only)" do
    it "allows index/show"                                            # AC8
    it "forbids create/update/destroy with 403"                       # AC8
  end

  context "as member without any branch permissions" do
    it "forbids all endpoints with 403"                               # AC9
  end

  context "as user with branches.manage but no branches.view (AC14)" do
    it "allows POST (201) but forbids GET show (403)"                 # AC14
  end
end
```

### 6.4. Acceptance

- `bundle exec rspec spec/requests/api/v1/branches_spec.rb spec/models/branch_spec.rb`
  — все зелёные, ≈60 request + ≈16 model тестов.
- **AC16 regression check:** общий `bundle exec rspec` — 0 failures.
  Счётчики F1 (`spec/requests/api/v1/properties_spec.rb`), F2
  (`spec/requests/api/v1/units_spec.rb`), F3
  (`spec/requests/api/v1/amenities_spec.rb` +
  `spec/requests/api/v1/unit_amenities_spec.rb`) — без изменений
  количества примеров. AC16 верифицируется как часть общего suite run,
  а не отдельным `it`.
- `rubocop` зелёный.

**Здесь делается коммит C3** (или C2+C3 при склейке).

---

## 7. Coverage ratchet

**Изменение:** `backend/spec/spec_helper.rb`

После прогона `rspec`, обновить
`minimum_coverage line: floor(actual) - 1`.

Ожидаемое после F4: ~70–73% (~60 новых тестов на ~180 строк
production). Floor → 69–72.

**Acceptance:** `rspec` зелёный с новым floor.

---

## 8. Docs sync

### 8.1. `ai-docs/PLAN.md`

Отметить как `[x]`:

- `1.4.1` Модель Branch — HW-1 F4
- `1.4.2` Иерархия parent/children — HW-1 F4
- `1.4.4` API CRUD подразделений — HW-1 F4

`1.4.3` (scope видимости сотрудников) **не** отмечается — явно вне
scope F4 (Brief/Spec).

### 8.2. `ai-docs/SCHEMA.md`

Добавить блок `Branch` в секцию **Phase 1: Auth & Multi-tenancy**,
после `JwtDenylist` и перед template comment (grounding §0: раздел
существует, последняя запись в нём — `JwtDenylist` на строке 80, далее
идёт закомментированный template и `### Phase 2`). Branch — часть
multi-tenancy-структуры (organization → branches → ...), поэтому Phase 1
— правильное место. Новую секцию Phase 1.4 **не** создавать.

```markdown
#### Branch

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null, on_delete: cascade |
| parent_branch_id | bigint | self-FK, nullable, on_delete: restrict |
| name | string(100) | not null, normalized strip |

**Associations:** belongs_to :organization, belongs_to :parent_branch
  (class_name: "Branch", optional: true), has_many :children
  (class_name: "Branch"); before_destroy guards deletion when
  children.exists?
**Validations:** name presence + length + uniqueness per (organization,
  parent_branch_id) case-insensitive; parent_branch_must_exist_in_org;
  parent_is_not_self; parent_is_not_descendant (on :update)
**Indexes:** [organization_id], [parent_branch_id], two partial unique
  indexes: (organization_id, parent_branch_id, LOWER(name)) WHERE
  parent_branch_id IS NOT NULL; (organization_id, LOWER(name)) WHERE
  parent_branch_id IS NULL
```

В блок **Organization**: добавить `has_many :branches`.

### 8.3. `ai-docs/DECISIONS.md` — DEC-014

Обязательная запись per Issue #4. Содержание:

```markdown
## DEC-014: Adjacency list for Branch tree (2026-04-09)

**Решение:** Branch-дерево реализовано через adjacency list — один
столбец `parent_branch_id` (self-referential FK). Иерархия обходится
Ruby-кодом или PostgreSQL `WITH RECURSIVE` по мере необходимости.

**Альтернативы:**

- Closure table (`branch_ancestries` join с depth).
- Gem `ancestry` / `closure_tree`.

**Причина выбора:**

- Adjacency list — Rails standard для tree-structures, минимум
  кода, без новых зависимостей.
- Ожидаемый размер дерева на организацию — десятки узлов, глубина
  3–5 уровней. На этом масштабе разница в производительности между
  adjacency list и closure table несущественна.
- CLAUDE.md запрещает новые gem'ы без явного согласования, поэтому
  `ancestry`/`closure_tree` вне scope HW-1.
- Closure table удваивает сложность writes (каждое перемещение
  пересчитывает поддерево), что не оправдано для HW-1 объёмов.
- Custom-валидации F4 (self-ref ban, cycle check, parent-must-exist-
  in-org, before_destroy) реализуются в adjacency list elegantly
  без дополнительной инфраструктуры.

**Влияние:** HW-1 F4 реализация. При росте до тысяч узлов на
организацию — может понадобиться пересмотр в пользу closure table,
но это отдельная фича за пределами HW-1.
```

### 8.4. `homeworks/hw-1/report.md`

- Заполнить блок «04 — Branches (tree)».
- Обновить строку F4 в сводной таблице.
- Coverage ratchet строка: `После F4 | <new_floor> | <actual>% | ...`.
- Отметить tree-pattern как задокументированный (DEC-014) и urok
  «ANTI-PATTERN warning в Spec — critical для security invariants».

### 8.5. `CLAUDE.md`

**Не трогаем** — F1 остаётся reference implementation. F4 добавляет
tree-паттерн, задокументированный в DEC-014 и Spec F4.

### 8.6. `homeworks/hw-1/PROMPTS.md`

После F4 накопились два урока, кандидаты в v2:

- **Spec review v2:** «если Spec требует custom error message на
  destroy — проверить, что `dependent: :restrict_with_error`
  не используется, т.к. Rails I18n default перекроет custom
  сообщение. Использовать `before_destroy` callback» (F3 R1 + F4
  B1 review).
- **Spec review v2:** «для security-critical инвариантов (cross-org
  isolation, permission boundaries) — требовать ANTI-PATTERN warning
  блок прямо в Spec §5 с конкретным "неправильным" кодом, не только
  позитивной формулировкой» (F4 B3 review).

Решение по переносу в PROMPTS.md — во время C4, не обязательно в F4.

**Acceptance docs sync:**

- `grep -n '1.4.1\|1.4.2\|1.4.4' ai-docs/PLAN.md` — все три с `[x]`.
- `grep -n '#### Branch' ai-docs/SCHEMA.md` — присутствует в Phase 1
  секции.
- `grep -n 'DEC-014' ai-docs/DECISIONS.md` — присутствует.
- `homeworks/hw-1/report.md` — строка F4 заполнена, Coverage ratchet
  строка добавлена.
- **Markdownlint:** `npx --yes markdownlint-cli2 "**/*.md"` — 0 errors.
  Обязательный шаг перед C4 commit, чтобы не получить отдельный hotfix
  коммит (F2 pattern — markdownlint errors в plan.md требовали
  отдельного fix-коммита).

**Здесь делается коммит C4.**

---

## 9. Verify (после всех коммитов)

```bash
cd backend
bundle exec rubocop
bundle exec rspec
```

- Оба зелёные.
- Line coverage ≥ новый ratchet floor.
- F1/F2/F3 specs без изменений остались зелёными (AC16).

```bash
git push origin hw-1
```

Проверить CI на ветке hw-1 (Draft PR #6).

Issue #4 — comment со ссылками brief/spec/plan/коммиты после всех
`active`.

---

## 10. Зависимости, предусловия, ограничения

- Все §12 Spec зависимости проверены grounding'ом §0.
- **Никаких новых gems.**
- Миграция одна (`create_branches`), существующие не трогаем.
- **Меняется общий код `permissions.rb`** (второй раз после F3).
- `BaseController` не трогаем (F1 hardening).
- F1, F2, F3 код не трогаем — ни controllers, ни specs, ни migrations
  (AC16).

## 11. Открытые вопросы Plan

_(Нет. Spec полностью покрывает F4, включая security ANTI-PATTERN
warning, все custom-валидации и cycle check algorithm. Plan не
вводит новых открытых вопросов.)_

## 12. Что НЕ делать в F4

- Не реализовывать `ancestors`/`descendants` публичные методы
  модели (§3.4).
- Не возвращать `children`/`parent_branch` в JSON (§6.1 AC13).
- Не добавлять поля кроме `name`/`parent_branch_id` (§13 D5).
- Не делать `dependent: :restrict_with_error` на `has_many :children`
  (F3 R1 урок).
- Не передавать `parent_branch_id` напрямую в `.new`/`.update` без
  scope resolve (§5.3 ANTI-PATTERN).
- Не вводить лимит глубины (§13 D8).
- Не трогать F1/F2/F3 код (AC16).
- Не реализовывать Branch↔Property связь (это F5).
