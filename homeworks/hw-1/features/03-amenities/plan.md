---
name: F3 Plan — Amenities (M:N with Unit)
status: active
related_issue: "#3"
umbrella_issue: "#1"
spec: ./spec.md
brief: ./brief.md
feature: 03-amenities
---

# Plan — Amenities (M:N with Unit)

> Пошаговый план реализации Spec [./spec.md](./spec.md). Форма
> плана повторяет F1/F2 (см.
> [F1 plan](../01-property-crud/plan.md) и
> [F2 plan](../02-unit-crud/plan.md)). Отличия F3 — новая форма
> (две связанные сущности, 8 эндпоинтов, **409 Conflict**, изменение
> `Permissions` concern, top-level `/units/:unit_id/amenities`
> маршрут, policy в Pundit **symbol-form**) — фиксируются явно в
> каждом шаге.

## 0. Группировка коммитов

**C0 — Spec hotfix (обязательно перед C1).** Plan review §11 P1
нашёл рассинхрон Spec E22b (ожидает 422) с разумной реализацией
(404, как E20/E21). Исправление Spec делается **отдельным коммитом
перед любым кодом**, чтобы implement-фаза шла против консистентной
Spec. См. §11 P1.

Базовая форма остальных коммитов — 4, как в F1/F2. **Риск D1 (ratchet)**
практически гарантирован: объём production-кода F3 больше, чем F2
(два контроллера + две policy + изменение Permissions), а ratchet
floor = 60. Порядок действий — тот же, что в F2 §0:

| # | Группа | Файлы | Шаги |
|---|---|---|---|
| C0 | Spec hotfix | `homeworks/hw-1/features/03-amenities/spec.md` (E22b 422→404 per §11 P1) | §11 P1 |
| C1 | Migrations + models + Permissions changes | две миграции, `app/models/amenity.rb`, `app/models/unit_amenity.rb`, изменения `app/models/unit.rb`, `app/models/organization.rb`, `app/models/concerns/permissions.rb` | §1, §2 |
| C2 | Controllers + policies + routes | `app/controllers/api/v1/amenities_controller.rb`, `app/controllers/api/v1/unit_amenities_controller.rb`, `app/policies/amenity_policy.rb`, `app/policies/unit_amenity_policy.rb`, `config/routes.rb` | §3, §4, §5 |
| C3 | Factories + specs (model + request) | `spec/factories/amenities.rb`, `spec/factories/unit_amenities.rb`, `spec/models/amenity_spec.rb`, `spec/models/unit_amenity_spec.rb`, `spec/requests/api/v1/amenities_spec.rb`, `spec/requests/api/v1/unit_amenities_spec.rb` | §6 |
| C4 | Coverage ratchet + docs sync + DEC-013 | `backend/spec/spec_helper.rb`, `ai-docs/PLAN.md`, `ai-docs/SCHEMA.md`, `ai-docs/DECISIONS.md`, `homeworks/hw-1/report.md` | §7, §8 |

**⚠️ Риск ratchet в C2 — почти наверняка сработает.** C2 добавит
оценочно ~200 строк production-кода (два controller ~100 + две
policy ~40 + routes + permissions changes) без тестов. При текущем
floor 60 это упадёт. Процедура та же, что в F2:

1. Локально прогнать `bundle exec rspec` перед C2 commit.
2. Если красный по `minimum_coverage` — **склеить C2 и C3**.
3. Если зелёный (маловероятно) — два отдельных коммита.

**Порядок применения внутри C2** (для избежания `uninitialized
constant` при случайном прогоне между шагами): сначала policies
(§3), потом controllers (§4), потом routes (§5).

**Grounding, выполненный при написании Plan (не повторять при
реализации):**

- `backend/config/routes.rb:18` — `resources :properties ... do
  resources :units ... end`. Units сейчас nested под properties.
  **F3 добавляет top-level `resources :units, only: [] do resources
  :amenities ... end`** — параллельно существующему nested. См. §5.
- `backend/app/models/concerns/permissions.rb` — текущий
  `ALL_PERMISSIONS` список содержит 15 кодов, `amenities.*` в нём
  нет. `PRESET_ROLES` имеет `admin` (= ALL_PERMISSIONS), `manager`
  (whitelist), `viewer` (whitelist). F3 добавляет два кода в
  `ALL_PERMISSIONS` и дополняет `manager`/`viewer` whitelists. См. §2.
- `backend/app/models/unit.rb` — содержит `belongs_to :property`,
  два enum'а, `normalizes :name`, валидации. **Ни одного `has_many`**.
  F3 добавляет первую пару `has_many :unit_amenities` + `has_many
  :amenities, through:`. См. §2.
- `backend/app/models/organization.rb` — содержит
  `has_many :memberships/:users/:roles/:properties`. F3 добавляет
  `has_many :amenities, dependent: :destroy`. См. §2.
- `backend/spec/factories/` — содержит
  `memberships/organizations/properties/roles/units/users.rb`.
  `amenities.rb` и `unit_amenities.rb` **отсутствуют**, создаются с
  нуля. См. §6.1.
- Ratchet floor: `minimum_coverage line: 60` (F2 post-bump). §7.

---

## 1. Миграции

### 1.1. `create_amenities`

**Файл (новый):**
`backend/db/migrate/<ts1>_create_amenities.rb`

```ruby
class CreateAmenities < ActiveRecord::Migration[8.1]
  def change
    create_table :amenities do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false, limit: 100

      t.timestamps
    end

    add_index :amenities, "organization_id, LOWER(name)",
              unique: true, name: "index_amenities_on_org_and_lower_name"
  end
end
```

**Fallback на raw SQL (R4 review finding).** Если Rails 8 отвергнет
string-form expression index (синтаксис зависит от версии adapter),
использовать raw SQL через `execute`:

```ruby
execute <<~SQL.squish
  CREATE UNIQUE INDEX index_amenities_on_org_and_lower_name
  ON amenities (organization_id, LOWER(name))
SQL
```

Проверить работоспособность string-form первой — это стандартный
идиоматический Rails 8 синтаксис; raw SQL оставить как резерв.

**Обоснования (Spec):**

- `organization` FK, `null: false`, `ON DELETE CASCADE` — инвариант
  §3.5.1 и §3.5.8. Согласовано с `Organization has_many :amenities,
  dependent: :destroy` (§2).
- `limit: 100` — синхронно с валидацией §7.1.
- `LOWER(name)` в уникальном индексе — реализация D2 (case-insensitive
  unique per org). PostgreSQL поддерживает expression-index. Имя
  индекса задано явно, т.к. генерируемое имя для expression-index
  длинное и нестабильное.
- Индекс `[organization_id]` уже создаётся `t.references` — отдельный
  не нужен.

### 1.2. `create_unit_amenities`

**Файл (новый):**
`backend/db/migrate/<ts2>_create_unit_amenities.rb`

```ruby
class CreateUnitAmenities < ActiveRecord::Migration[8.1]
  def change
    create_table :unit_amenities do |t|
      t.references :unit, null: false, foreign_key: { on_delete: :cascade }
      t.references :amenity, null: false, foreign_key: { on_delete: :restrict }

      t.timestamps
    end

    add_index :unit_amenities, [ :unit_id, :amenity_id ], unique: true
  end
end
```

**Обоснования (Spec):**

- `unit` FK `ON DELETE CASCADE` — инвариант §3.5.7 (удаление Unit
  каскадит привязки).
- **`amenity` FK `ON DELETE RESTRICT`** — инвариант §3.5.6
  (DB-уровневая защита от удаления amenity в использовании). Явно
  указано `on_delete: :restrict`, это умолчание PG, но фиксируется
  для читаемости.
- Составной unique index `[unit_id, amenity_id]` — инвариант §3.3
  (повторная привязка → 422).
- `t.timestamps` — оба поля, согласовано с §6.2 (UnitAmenity JSON
  возвращает оба timestamp).

### 1.3. Команды

```bash
cd backend
bin/rails g migration CreateAmenities organization:references name:string
bin/rails g migration CreateUnitAmenities unit:references amenity:references
# Привести к виду выше (null: false, limit, on_delete, expression index).
bin/rails db:migrate
bin/rails db:migrate RAILS_ENV=test
```

**Acceptance:**

- `db/schema.rb` содержит обе таблицы с FK и индексами (включая
  expression-index на `LOWER(name)`).
- `bin/rails db:migrate:status` показывает обе миграции `up` в
  `development` и `test`.

---

## 2. Модели и Permissions

### 2.1. `Amenity`

**Файл (новый):** `backend/app/models/amenity.rb`

```ruby
class Amenity < ApplicationRecord
  belongs_to :organization
  has_many :unit_amenities
  has_many :units, through: :unit_amenities

  normalizes :name, with: ->(v) { v.to_s.strip }

  validates :name,
            presence: true,
            length: { maximum: 100 },
            uniqueness: { case_sensitive: false, scope: :organization_id }

  before_destroy :prevent_destroy_if_in_use

  private

  def prevent_destroy_if_in_use
    return unless unit_amenities.exists?

    errors.add(:base, "Amenity is in use and cannot be deleted")
    throw(:abort)
  end
end
```

**Обоснования:**

- `normalizes :name` со `strip` — как в F1/F2, D2 Spec явно запрещает
  squeeze.
- `uniqueness: { case_sensitive: false, scope: :organization_id }` —
  Rails-уровневая проверка, которая дополняет DB expression-index.
  Rails проверит раньше и даст 422 с сообщением «Name has already
  been taken», DB-индекс защитит от race conditions.
- **Оба механизма нужны** — без Rails-валидации race создаст
  `ActiveRecord::RecordNotUnique` вместо валидационного 422.
- `length: { maximum: 100 }` — синхронно с миграцией и §7.1.
- **`before_destroy` callback вместо `dependent: :restrict_with_error`** —
  R1 review finding. Spec §5.5/E16/AC5 фиксирует точное сообщение
  `"Amenity is in use and cannot be deleted"`. Rails
  `restrict_with_error` использует I18n-ключ
  `activerecord.errors.messages.restrict_dependent_destroy.has_many`,
  который даёт дефолтное «Cannot delete record because dependent
  unit amenities exist» — **не** совпадает со Spec-сообщением. Тесты
  проверяют фрагмент «in use», тест упал бы. `before_destroy` с
  явным `errors.add(:base, ...)` + `throw(:abort)` даёт:
  - `amenity.destroy` возвращает `false` (как при
    `restrict_with_error`);
  - `amenity.errors[:base]` содержит точное сообщение Spec;
  - контроллер `if amenity.destroy ... else render 409` работает
    без изменений.
  DB-level `ON DELETE RESTRICT` остаётся нетронутым (§1.2,
  §3.5.6 DB-сторона) — защита от прямых SQL независима от ORM-колбэка.

### 2.2. `UnitAmenity`

**Файл (новый):** `backend/app/models/unit_amenity.rb`

```ruby
class UnitAmenity < ApplicationRecord
  belongs_to :unit
  belongs_to :amenity

  validates :unit_id, uniqueness: { scope: :amenity_id }
end
```

**Обоснования:**

- `belongs_to` без `optional: true` — автоматическая presence-валидация
  «Unit must exist» / «Amenity must exist» (§7.2). Покрывает E20/E22b.
- `uniqueness: { scope: :amenity_id }` — Rails-валидация дубликатов
  (§7.2, E23), дополняет DB unique index.
- Иммутабельность: `PATCH` не поддерживается (§5), модель не имеет
  `update_*` методов; `t.timestamps` даёт `updated_at`, но он меняется
  только при create (один раз).

### 2.3. Обновления существующих моделей

**`backend/app/models/unit.rb`** — добавить ассоциации после
`belongs_to :property`:

```ruby
has_many :unit_amenities, dependent: :destroy
has_many :amenities, through: :unit_amenities
```

**`backend/app/models/organization.rb`** — добавить в блок ассоциаций:

```ruby
has_many :amenities, dependent: :destroy
```

**Обоснования:**

- `dependent: :destroy` на `Unit has_many :unit_amenities` — ORM-сторона
  §3.5.7.
- `dependent: :destroy` на `Organization has_many :amenities` — §3.5.8
  (поведение при удалении org не определено, но ORM-уровень согласован).

### 2.4. `Permissions` concern

**Изменение:** `backend/app/models/concerns/permissions.rb`

- В `ALL_PERMISSIONS` добавить:
  - `"amenities.view"`
  - `"amenities.manage"`
- В `PRESET_ROLES[:manager][:permissions]` добавить:
  - `amenities.manage`, `amenities.view`
- В `PRESET_ROLES[:viewer][:permissions]` добавить:
  - `amenities.view`
- `admin` обновлять **не** нужно — у него `permissions: ALL_PERMISSIONS`,
  добавление новых кодов в список покрывает admin автоматически.

**Обоснования:**

- §4.3 Spec явно фиксирует обновления, включая notes про существующие
  Role-записи (не обновляются ретроактивно, зафиксировано как
  ограничение HW-1).

### 2.5. Шаги

1. Создать `amenity.rb`, `unit_amenity.rb`.
2. Обновить `unit.rb`, `organization.rb` (добавить ассоциации).
3. Обновить `permissions.rb` (add codes to both constants).
4. `bundle exec rubocop -A` на всех изменённых файлах.

**Acceptance:**

- `bin/rails runner 'Amenity.new.tap(&:valid?).errors.full_messages'`
  возвращает ошибки на `name`, `organization`.
- `bin/rails runner 'UnitAmenity.new.tap(&:valid?).errors.full_messages'`
  возвращает ошибки на `unit`, `amenity`.
- `bin/rails runner 'puts Permissions::ALL_PERMISSIONS.include?("amenities.manage")'` → `true`.
- `bin/rails runner 'puts Permissions::ALL_PERMISSIONS.include?("amenities.view")'` → `true`.
- `bin/rails runner 'puts Permissions::PRESET_ROLES[:manager][:permissions].include?("amenities.manage")'` → `true`.
- `bin/rails runner 'puts Permissions::PRESET_ROLES[:viewer][:permissions].include?("amenities.view")'` → `true` (V1 review finding).
- Все enum-инварианты F3 (restrict, uniqueness) автоматизированы в
  model spec §6.3.

**Здесь делается коммит C1.**

---

## 3. Pundit policies

### 3.1. `AmenityPolicy`

**Файл (новый):** `backend/app/policies/amenity_policy.rb`

```ruby
class AmenityPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("amenities.view")
  end

  def show?
    Current.membership&.can?("amenities.view")
  end

  def create?
    Current.membership&.can?("amenities.manage")
  end

  def update?
    Current.membership&.can?("amenities.manage")
  end

  def destroy?
    Current.membership&.can?("amenities.manage")
  end
end
```

Форма 1:1 с `PropertyPolicy` / `UnitPolicy`. Reference pattern F1/F2.

### 3.2. `UnitAmenityPolicy`

**Файл (новый):** `backend/app/policies/unit_amenity_policy.rb`

```ruby
class UnitAmenityPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("units.view") &&
      Current.membership&.can?("amenities.view")
  end

  def create?
    Current.membership&.can?("units.manage")
  end

  def destroy?
    Current.membership&.can?("units.manage")
  end
end
```

**Обоснования:**

- `index?` проверяет **оба** разрешения (Spec §4.4 «Реализация
  проверки и имя policy»).
- `create?`/`destroy?` — только `units.manage` (Spec D4b).
- Policy **не обращается к `record`** — DEC-012 принцип из F2,
  повторён для F3: invariant, нарушение которого ломает §4.7 ordering.
- Имя `UnitAmenityPolicy` зафиксировано Spec §4.4 — контроллер вызывает
  `authorize :unit_amenity, :action?` (symbol-form).

**Acceptance шагов 3.1/3.2:**

- `rubocop` зелёный.
- `bin/rails runner 'AmenityPolicy.new(nil, nil)'` и
  `'UnitAmenityPolicy.new(nil, nil)'` грузятся без ошибок.
- Полная поведенческая верификация — через request spec §6.

---

## 4. Контроллеры

### 4.1. `Api::V1::AmenitiesController`

**Файл (новый):** `backend/app/controllers/api/v1/amenities_controller.rb`

Форма 1:1 с F1 `PropertiesController` (reference pattern CLAUDE.md).
Отличие — **409 на destroy, когда `before_destroy` callback модели
отменил удаление** (§2.1, R1).

```ruby
module Api
  module V1
    class AmenitiesController < BaseController
      def index
        authorize Amenity
        amenities = Current.organization.amenities.order(:id)
        render json: amenities.map { |a| amenity_json(a) }
      end

      def show
        amenity = find_amenity
        return if performed?

        authorize amenity
        render json: amenity_json(amenity)
      end

      def create
        authorize Amenity
        amenity = Current.organization.amenities.new(amenity_params)
        if amenity.save
          render json: amenity_json(amenity), status: :created
        else
          render json: { error: amenity.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        amenity = find_amenity
        return if performed?

        authorize amenity

        if amenity.update(amenity_params)
          render json: amenity_json(amenity)
        else
          render json: { error: amenity.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        amenity = find_amenity
        return if performed?

        authorize amenity

        if amenity.destroy
          head :no_content
        else
          render json: { error: amenity.errors.full_messages }, status: :conflict
        end
      end

      private

      def find_amenity
        amenity = Current.organization.amenities.find_by(id: params[:id])
        unless amenity
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        amenity
      end

      def amenity_params
        params.require(:amenity).permit(:name)
      end

      def amenity_json(amenity)
        {
          id: amenity.id,
          organization_id: amenity.organization_id,
          name: amenity.name,
          created_at: amenity.created_at,
          updated_at: amenity.updated_at
        }
      end
    end
  end
end
```

**Обоснования (Spec):**

- Порядок `find_amenity → authorize amenity → action` — §4.6
  «Порядок контроллера для плоских `/amenities` эндпоинтов», F1 паттерн.
- **`destroy` без `!`**: `if amenity.destroy` — §5.5 «Поведение
  контроллера». Возврат `false` от `before_destroy` callback модели
  (§2.1) даёт 409 с `errors.full_messages` (формат массива, §5.5,
  E16). Исключения (`InvalidForeignKey`) штатным путём не возникают
  — DB-level RESTRICT срабатывает только при прямом SQL.
- `amenity_json` явно перечисляет поля — стабильный контракт §6.1,
  AC12.
- `organization_id` **не** в `permitted_params` — инвариант §3.5.2,
  AC11.
- `if .save` / `if .update` — единообразно с F1/F2.

### 4.2. `Api::V1::UnitAmenitiesController`

**Файл (новый):**
`backend/app/controllers/api/v1/unit_amenities_controller.rb`

```ruby
module Api
  module V1
    class UnitAmenitiesController < BaseController
      def index
        unit = find_unit
        return if performed?

        authorize :unit_amenity, :index?
        amenities = unit.amenities.order(:id)
        render json: amenities.map { |a| amenity_json(a) }
      end

      def create
        unit = find_unit
        return if performed?

        authorize :unit_amenity, :create?

        permitted = params.require(:unit_amenity).permit(:amenity_id)
        amenity = Current.organization.amenities.find_by(id: permitted[:amenity_id])
        unless amenity
          render json: { error: "Not found" }, status: :not_found
          return
        end

        unit_amenity = unit.unit_amenities.new(amenity: amenity)
        if unit_amenity.save
          render json: unit_amenity_json(unit_amenity), status: :created
        else
          render json: { error: unit_amenity.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        unit = find_unit
        return if performed?

        authorize :unit_amenity, :destroy?

        unit_amenity = unit.unit_amenities.find_by(amenity_id: params[:id])
        unless unit_amenity
          render json: { error: "Not found" }, status: :not_found
          return
        end

        unit_amenity.destroy!
        head :no_content
      end

      private

      def find_unit
        unit = Current.organization.units.find_by(id: params[:unit_id])
        unless unit
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        unit
      end

      def amenity_json(amenity)
        {
          id: amenity.id,
          organization_id: amenity.organization_id,
          name: amenity.name,
          created_at: amenity.created_at,
          updated_at: amenity.updated_at
        }
      end

      def unit_amenity_json(ua)
        {
          id: ua.id,
          unit_id: ua.unit_id,
          amenity_id: ua.amenity_id,
          created_at: ua.created_at,
          updated_at: ua.updated_at
        }
      end
    end
  end
end
```

**Обоснования (Spec):**

- **Порядок §4.7** реализован дословно: `find_unit → authorize → (для
  create: require+permit+find amenity) → (для destroy: find
  unit_amenity) → действие`.
- **`authorize :unit_amenity, :action?`** — symbol-form, §4.4. Используется
  во всех трёх экшенах, чтобы сохранить тот же порядок «авторизация
  до резолва дочернего ресурса».
- **`Current.organization.amenities.find_by(id: permitted[:amenity_id])`** —
  единое 404 для обоих случаев (несуществующий и чужой amenity) —
  §5.6, §4.7 шаг 5. После C0 Spec также фиксирует E22b (wrapper без
  поля) как 404 — `find_by(id: nil) → nil → 404`, логика контроллера
  не меняется.
- **`params.require(:unit_amenity).permit(:amenity_id)`** — M5 wrapper
  convention, §5.6.
- **`params[:id]`** в destroy — m2 Rails nested route convention, §5.8.
- `unit.unit_amenities.new(amenity: amenity)` — `unit_id` подставляется
  из association scope, не из тела; инвариант «нельзя привязать чужой
  unit» уже покрыт `find_unit`.
- `UnitAmenity.create` дубликата даст `errors[:unit_id]` от Rails
  `uniqueness` валидации → 422 с массивом (§5.6 422 case, E23).
- Если в permitted нет `amenity_id` (wrapper без поля, E22b) →
  `find_by(id: nil)` → `nil` → контроллер рендерит 404.

**Примечание по E22b:** исходный Spec §9 E22b ожидал 422, но это
рассинхрон с разумной реализацией (`find_by(id: nil) → nil → 404`
раньше валидации). Исправлено Spec hotfix'ом C0 (§0, §11 P1)
**перед** C1. К моменту C2 Spec и реализация согласованы: E22b → 404.

### 4.3. Acceptance шагов 4.1/4.2

- `rubocop` зелёный.
- `bin/rails runner 'Api::V1::AmenitiesController; Api::V1::UnitAmenitiesController'`
  грузится.
- Поведенческая верификация — через request spec §6.

---

## 5. Routes

**Изменение:** `backend/config/routes.rb`

Текущее (grounding §0):

```ruby
resources :properties, only: [ :index, :show, :create, :update, :destroy ] do
  resources :units, only: [ :index, :show, :create, :update, :destroy ]
end
```

После F3:

```ruby
resources :properties, only: [ :index, :show, :create, :update, :destroy ] do
  resources :units, only: [ :index, :show, :create, :update, :destroy ]
end

resources :amenities, only: [ :index, :show, :create, :update, :destroy ]

resources :units, only: [] do
  resources :amenities, only: [ :index, :create, :destroy ],
            controller: "unit_amenities"
end
```

**Обоснования (Spec §5):**

- `resources :amenities` — плоский CRUD каталога, §5.1–§5.5.
- **`resources :units, only: []`** — top-level units без direct CRUD
  (units доступны только через `/properties/:id/units/...` из F2).
  Это второй «входной path» для units, исключительно как родитель
  для amenities подресурса. Spec §5.6–§5.8 явно использует URL
  `/api/v1/units/:unit_id/amenities`, не nested под property.
- **`controller: "unit_amenities"`** — т.к. nested `resources
  :amenities` иначе искал бы `Api::V1::AmenitiesController`, но
  контроллер называется `UnitAmenitiesController` (§4.2).
  Явный override маршрутит nested subresource на правильный класс.
- Путь `DELETE /api/v1/units/:unit_id/amenities/:id` — `:id`
  семантически amenity_id (§5.8, m2).

**Архитектурная заметка (R3 review finding).** F3 впервые делает
units доступными **без property parent в URL**: до F3 единственный
путь к unit — `/api/v1/properties/:property_id/units/:id` (F2).
Новый путь `/api/v1/units/:unit_id/amenities` нарушает это
ограничение, но **только в качестве родительского контекста для
amenities subresource**: `only: []` гарантирует, что прямых CRUD
эндпоинтов для units по плоскому пути не появляется. Это сознательное
отступление per Spec §5.6–§5.8.

Следствие для будущего: **`GET /api/v1/units/:id` (flat show) не
должен появляться без явного пересмотра multi-org изоляции** — сейчас
property служит защитным контекстом, убрать его = снова проверить
scope через Organization. Любая будущая фича, которая захочет flat
units endpoint, должна явно решать это отдельной DEC. В HW-1 этот
путь не рассматривается.

**Acceptance:**

- `bin/rails routes -g amenities` показывает 8 маршрутов: 5 плоских
  (`amenities#*`) и 3 nested (`unit_amenities#*`).
- `bin/rails routes -g units` показывает **оба**: старые nested под
  properties (`units#*`) и новые nested amenities
  (`unit_amenities#*`).

**Здесь делается коммит C2 (если coverage держится) или C2+C3
склеенный коммит.**

---

## 6. Factories и specs

### 6.1. Factories

**Файл (новый):** `backend/spec/factories/amenities.rb`

```ruby
FactoryBot.define do
  factory :amenity do
    organization
    sequence(:name) { |n| "Amenity #{n}" }
  end
end
```

**Файл (новый):** `backend/spec/factories/unit_amenities.rb`

```ruby
FactoryBot.define do
  factory :unit_amenity do
    unit
    amenity
  end
end
```

**Обоснования:**

- `sequence(:name)` избегает дубликатов uniqueness при множественных
  `create(:amenity)` в одном тесте.
- Factory `:unit_amenity` создаёт `unit` и `amenity` как ассоциации —
  но обе могут оказаться в **разных** организациях (каждая factory
  делает свой `create(:organization)`). Это **проблема** для тестов,
  которые хотят чистую сессию: реальный UnitAmenity всегда имеет
  unit и amenity в одной org.

**Решение:** в тестах, где нужна согласованность org, явно передавать:

```ruby
org = create(:organization)
unit = create(:unit, property: create(:property, organization: org))
amenity = create(:amenity, organization: org)
create(:unit_amenity, unit: unit, amenity: amenity)
```

Factory-level trait для согласованной org (`:with_same_org`) — можно
добавить, но в HW-1 оставляем явность ради читаемости тестов.

**Acceptance:** factories проверяются транзитивно через model spec
§6.2 (используют `create(:amenity)` и `create(:unit_amenity, ...)`).

### 6.2. Model specs

**Файл (новый):** `backend/spec/models/amenity_spec.rb`

Тесты:

```text
RSpec.describe Amenity, type: :model do
  describe "uniqueness (case-insensitive per org)" do
    it "rejects duplicate with different case in same org"       # AC6
    it "allows same name in different orgs"                       # изоляция
  end

  describe "normalization" do
    it "strips leading/trailing whitespace in name"               # §3.2
  end

  describe "before_destroy :prevent_destroy_if_in_use (R1 fix)" do
    it "returns false on destroy when unit_amenities exist"       # AC16, §3.5.6
    it "populates errors[:base] with exact Spec message"          # AC16, §5.5
    it "allows destroy when no unit_amenities"                    # AC5 happy
  end
end
```

**Файл (новый):** `backend/spec/models/unit_amenity_spec.rb`

```text
RSpec.describe UnitAmenity, type: :model do
  describe "cascade delete from Unit" do
    it "destroys unit_amenities when parent unit is destroyed"    # AC15, §3.5.7
  end

  describe "uniqueness (unit_id, amenity_id)" do
    it "rejects duplicate attachment"                             # E23
  end

  describe "presence validations" do
    it "is invalid without unit"                                  # §7.2
    it "is invalid without amenity"                               # §7.2
  end
end
```

### 6.3. Request specs

**Файл (новый):** `backend/spec/requests/api/v1/amenities_spec.rb`

Структура — форма F2 `units_spec.rb`, адаптированная под flat
эндпоинт `/amenities`:

```text
RSpec.describe "Api::V1::Amenities" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth token" do
    it "returns 401 for index/show/create/update/destroy"         # AC9
  end

  describe "without X-Organization-Id" do
    it "returns 422 with 'Organization not selected' on GET index" # AC10, E2
  end

  describe "GET /api/v1/amenities" do
    it "returns [] for empty org"                                  # AC1
    it "returns amenities sorted by id"                            # AC1
  end

  describe "GET /api/v1/amenities/:id" do
    it "returns amenity as JSON with all keys"                     # AC12
    it "returns 404 for non-existing id"                           # E6
  end

  describe "POST /api/v1/amenities" do
    it "creates amenity and returns 201"                           # AC1
    it "trims whitespace in name"                                  # §3.2
    it "ignores organization_id in body"                           # AC11, E11
    it "returns 422 when name is blank"                            # E7
    it "returns 422 when name is whitespace-only (V4)"             # §3.1/§3.2 normalize → presence
    it "returns 422 when name too long (>100)"                     # E8
    it "returns 422 when case-insensitive duplicate (Wi-Fi/wi-fi)" # AC6, E9
    it "returns 400 when 'amenity' key missing"                    # E10
  end

  describe "PATCH /api/v1/amenities/:id" do
    it "updates name and returns 200"                              # AC1
    it "trims whitespace in name on update (V5)"                   # §3.2 normalize на update
    it "ignores organization_id in body"                           # AC11, E12
    it "returns 200 when name equals self (not a duplicate)"       # E14
    it "returns 422 when name blank"                               # валидация
    it "returns 422 when duplicate with another amenity"           # E13
  end

  describe "DELETE /api/v1/amenities/:id" do
    it "deletes amenity without attachments -> 204"                # AC1, E15
    it "returns 409 with error array when amenity is in use"       # AC5, E16
    it "returns 404 for non-existing id"                           # E17
  end

  context "another organization's amenity" do
    # AC3 — all four operations -> 404
  end

  context "as viewer (amenities.view only)" do
    # AC7 — index/show 200, create/update/destroy 403
  end

  context "as user without any permissions" do
    # AC8 — all 403
  end

  context "as user with amenities.manage but no amenities.view" do
    # AC8 edge case — create 201, show 403
    # Requires custom role construction (§12 Spec)
  end
end
```

**Файл (новый):** `backend/spec/requests/api/v1/unit_amenities_spec.rb`

```text
RSpec.describe "Api::V1::UnitAmenities" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }
  let(:amenity) { create(:amenity, organization: organization) }

  describe "without auth token" do
    it "returns 401 for index/create/destroy"                      # AC9
  end

  describe "without X-Organization-Id" do
    it "returns 422 on GET index"                                  # AC10
  end

  describe "GET /api/v1/units/:unit_id/amenities" do
    it "returns [] for unit with no amenities"                     # E25
    it "returns attached amenities sorted by amenity.id"           # §5.7
    it "returns 404 for non-existing :unit_id"                     # E24
    it "returns 404 for unit of another organization"              # §5.7
  end

  describe "POST /api/v1/units/:unit_id/amenities" do
    it "attaches amenity and returns 201 with UnitAmenity JSON"    # AC2, AC13
    it "returns 400 when 'unit_amenity' key missing"               # E22
    it "returns 404 when 'unit_amenity' present but amenity_id nil" # E22b (per Plan resolution, see §4.2 note)
    it "returns 404 for non-existing :unit_id"                     # E18
    it "returns 404 for foreign :unit_id"                          # E19
    it "returns 404 for non-existing amenity_id in body"           # E20
    it "returns 404 for amenity_id of another organization"        # E21
    it "returns 422 on duplicate attachment"                       # E23
  end

  describe "DELETE /api/v1/units/:unit_id/amenities/:id" do
    it "detaches amenity and returns 204"                          # AC2
    it "returns 404 for non-existing :unit_id"                     # §5.8
    it "returns 404 when amenity exists but not attached"          # E27
    it "returns 404 when :id does not exist"                       # E27b
    it "returns 404 when :id is amenity of another org"            # E28
  end

  context "as viewer" do
    # AC7 — index 200, create/destroy 403
  end

  context "as user with units.manage + units.view but no amenities.view" do
    # AC8 edge case — GET index 403
  end

  context "as user with only units.view (no manage, no amenities.view)" do
    # V3 review finding — E26 exact wording
    it "returns 403 on GET index"
  end

  context "as user with amenities.view but no units.view/manage" do
    # AC8 symmetric edge case — GET index 403
    # Both require custom roles (§12 Spec)
  end

  context "AC17 collision: no-perm + foreign :unit_id" do
    # POST returns 404, not 403 (§4.7)
  end

  context "AC14 — F2 Unit JSON unchanged" do
    it "GET /api/v1/properties/:pid/units/:uid does not include 'amenities' key after attach"
    # Positive regression test per AC14 fix
  end
end
```

**Количественная оценка:** ~55 новых тестов (20 request amenities,
25 request unit_amenities, 10 model). Ожидаемый прирост coverage
— значительный; floor после F3 должен подняться до ~65–70.

**Acceptance:**

- `bundle exec rspec spec/requests/api/v1/amenities_spec.rb spec/requests/api/v1/unit_amenities_spec.rb spec/models/amenity_spec.rb spec/models/unit_amenity_spec.rb`
  — все зелёные.
- `bundle exec rspec` — общий suite зелёный, no regressions в F1/F2.
- **AC14 позитивный тест проходит** — `GET /units/:id` не содержит
  ключа `amenities` после attach.
- `bundle exec rubocop` — зелёный.

**Здесь делается коммит C3** (или C2+C3 объединены).

---

## 7. Coverage ratchet

**Изменение:** `backend/spec/spec_helper.rb`

После прогона `rspec`, посмотреть `Line Coverage`, обновить
`minimum_coverage line: floor(actual) - 1`.

**Обоснования:**

- Правило ratchet из `WORKING_AGREEMENTS.md`.
- Старт F3: 60 (после F2). Ожидаемое после F3: ~65–70 (~55 новых
  тестов на ~250 строк новых controller+policy+model+Permissions).
- Финальная цель HW-1: 80.

**Acceptance:** `bundle exec rspec` зелёный с новым `minimum_coverage`.

---

## 8. Docs sync

### 8.1. `ai-docs/PLAN.md`

Отметить как `[x]`:

- `2.1.3` «Модель `Amenity` + join-таблица `UnitAmenity`» — HW-1 F3
- `2.2.3` «Управление amenities» — HW-1 F3 (CRUD каталога +
  attach/detach subresource)

### 8.2. `ai-docs/SCHEMA.md`

В раздел **Phase 2: Properties & Units** после блока Unit добавить:

```markdown
#### Amenity

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null, on_delete: cascade |
| name | string(100) | not null, normalized strip |

**Associations:** belongs_to :organization, has_many :unit_amenities,
  has_many :units (through: :unit_amenities); before_destroy guards
  deletion when unit_amenities.exists? (returns 409 via controller)
**Validations:** name presence + length(<=100) + uniqueness (case-insensitive per org)
**Indexes:** [organization_id], unique [organization_id, LOWER(name)]

#### UnitAmenity (join)

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| unit_id | bigint | FK, not null, on_delete: cascade |
| amenity_id | bigint | FK, not null, on_delete: restrict |

**Associations:** belongs_to :unit, belongs_to :amenity
**Validations:** unique [unit_id, amenity_id]
**Indexes:** [unit_id], [amenity_id], unique [unit_id, amenity_id]
```

В блок **Unit** добавить к Associations:
`has_many :unit_amenities, has_many :amenities (through)`.

В блок **Organization** добавить к Associations:
`has_many :amenities`.

### 8.3. `ai-docs/DECISIONS.md` — DEC-013

**Обязательная запись** per Issue #3 pipeline. После DEC-012 добавить:

```markdown
## DEC-013: has_many :through for Unit <-> Amenity (2026-04-08)

**Решение:** M:N связь Unit ↔ Amenity реализована через явную
join-модель `UnitAmenity` и `has_many :through :unit_amenities`.

**Альтернативы:** `has_and_belongs_to_many` (HABTM).

**Причина выбора:**

- HABTM устарел для нового кода в Rails 8; community best practice —
  `has_many :through`.
- `UnitAmenity` как полноценный ActiveRecord позволяет:
  - явные валидации (`uniqueness (unit_id, amenity_id)`);
  - callbacks и observers при необходимости;
  - прямой доступ к join-атрибутам (сейчас только timestamps, в
    будущем — `attached_at`, `source`, `confidence`);
  - возможность для Amenity модели добавить `before_destroy` callback
    с кастомным сообщением для инварианта §3.5.6 F3 Spec, что
    невозможно в HABTM (нет модели для callback'ов).

**Влияние:** HW-1 F3 реализация; паттерн для всех будущих M:N в проекте.
```

### 8.4. `homeworks/hw-1/report.md`

- Заполнить блок «03 — Amenities (M:N)»: time Brief/Spec/Plan/Implement,
  итерации ревью (Brief 2, Spec 3 (включая три прохода), Plan TBD).
- Обновить строку 3 в сводной таблице (`pending` → `done`).
- Добавить строку в Coverage ratchet: `После F3 | <new_floor> |
  <actual>% | bumped`.
- Отметить AC14 (F2 JSON contract регрессия) как успешно защищённый
  позитивным тестом.
- Отметить урок «Spec review должен делать два прохода: локальный
  фикс + поиск последствий по всему документу» — это прямой урок из
  трёх итераций F3 Spec review, кандидат для PROMPTS.md v2 после F4.

### 8.5. `homeworks/hw-1/PROMPTS.md`

После F3 достаточно данных (F2 + F3) для формализации двух
адаптированных промптов:

- **Spec review v2 (Apartus):** добавить пункт «для каждого
  зафиксированного решения (D-entry) прогнать по всему документу
  поиск потенциальных следствий — упоминания старого варианта в AC,
  E-сценариях, §4.7 порядке, JSON-контрактах».
- **Plan review v2:** добавить пункт «для каждого нового кода статуса
  (не 200/201/204/400/401/403/404/422) указать механизм его
  получения в controller (возврат `false`, exception rescue, явный
  render) и как это тестируется».

Решение по включению — во время C4, не обязательно в F3.

### 8.6. `CLAUDE.md`

**Не трогаем** — F1 остаётся reference implementation. F3 добавляет
новые паттерны (409, symbol-form policy, M:N), но они документированы
в DEC-013 и Spec F3, не в CLAUDE.md.

**Acceptance docs sync:**

- `grep -n '2.1.3\|2.2.3' ai-docs/PLAN.md` — оба с `[x]`.
- `grep -n '#### Amenity\|#### UnitAmenity' ai-docs/SCHEMA.md` —
  оба присутствуют.
- `grep -n 'DEC-013' ai-docs/DECISIONS.md` — присутствует.
- `homeworks/hw-1/report.md` — строка F3 в таблице заполнена,
  Coverage ratchet строка добавлена.

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
- F1 и F2 specs **без единого изменения** остались зелёными (AC14 +
  отсутствие регрессий).

```bash
git push origin hw-1
```

Проверить CI на ветке hw-1 (Draft PR #6 — контейнер).

Issue #3 — comment со ссылками brief/spec/plan/коммиты после того,
как все артефакты в `active` и реализация закоммичена.

---

## 10. Зависимости, предусловия, ограничения

- Все §12 Spec зависимости проверены grounding'ом §0.
- **Никаких новых gems.**
- Миграции: две новые (`create_amenities`, `create_unit_amenities`),
  существующие не трогаем.
- **Меняются файлы общего кода:** `permissions.rb` (впервые в HW-1
  после F1) — явное изменение, согласованное со Spec §4.3.
- `BaseController` не трогаем (F1 hardening достаточен).
- F1, F2 код **не трогаем** — ни controllers, ни specs, ни migrations.
  AC14 обеспечивается позитивным тестом в F3 spec, а не изменением F2.

## 11. Открытые вопросы Plan

**P1. Spec E22b vs разумная реализация контроллера (из §4.2).**

Spec §9 E22b ожидает 422 для `{"unit_amenity": {}}`, но контроллер
делает 404 раньше (через `find_by(id: nil)`). Два варианта:

1. Обновить Spec E22b → 404. **Рекомендуется:** консистентно с E20
   (несущ amenity_id → 404) и E21 (amenity чужой org → 404).
   «Amenity не найден» — одна семантика, один код.
2. Изменить контроллер: `if permitted[:amenity_id].nil?` сделать
   `unit_amenities.new(amenity: nil).save` → 422. **Усложнение без
   реальной выгоды** — клиент не различит 404 и 422 всё равно.

**Решение:** идём по варианту 1. E22b → 404. Апдейт Spec делается
**отдельным коммитом C0 перед C1** (§0), чтобы implement-фаза шла
против консистентной Spec. Это единственный Spec-апдейт по итогам
Plan review.

**C0 содержание:**

- §9 E22b: код `422` → `404`, тело из `{"error":["Amenity must
  exist"]}` → `— (единое 404, §5.6)`.
- §4.7 шаг 5 уже говорит «`find_by(id: nil)` → `nil` →
  валидация... → `422`» — это тоже нужно обновить на «→ `nil` →
  404, как E20/E21» для консистентности.
- Любые другие места, где упомянуто E22b/422 — найти grep'ом.

После C0 Spec и Plan согласованы; C1 начинается.

## 12. Что НЕ делать в F3

- Не реализовывать replace-all (`PATCH /units/:id {amenity_ids: [...]}`)
  — Spec §13 D5.
- Не включать amenities в JSON `GET /units/:id` — AC14.
- Не добавлять поля `description`/`icon`/`category`/`code` к Amenity
  — §13 D-open.
- Не делать bulk attach/detach — §2.2.
- Не трогать BaseController, F1/F2 controllers/specs/migrations.
- Не обновлять существующие Role-записи в БД (ретроактивная data
  migration permissions) — §4.3.
- Не добавлять отдельный `amenities.link` permission — §13 D4b.
- Не делать DELETE unit_amenity через `/api/v1/unit_amenities/:id`
  (плоский путь) — только nested.
