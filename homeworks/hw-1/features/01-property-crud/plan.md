---
name: F1 Plan — Property CRUD
status: active
related_issue: "#10"
umbrella_issue: "#1"
spec: ./spec.md
brief: ./brief.md
feature: 01-property-crud
---

# Plan — Property CRUD

> Пошаговый план реализации Spec [./spec.md](./spec.md). Каждый шаг
> атомарен, проверяем, и относится к одному коммиту (или подкоммиту
> внутри логической группы — см. §«Группировка коммитов»).

## 0. Группировка коммитов (3 импл-коммита + 1 docs)

| # | Группа | Файлы | Покрывает шаги |
|---|---|---|---|
| C1 | Migration + model | миграция, `app/models/property.rb`, изменение `app/models/organization.rb` | §1, §2 |
| C2 | Controller + policy + routes + Pundit rescue | `app/controllers/api/v1/properties_controller.rb`, `app/policies/property_policy.rb`, `config/routes.rb`, `app/controllers/api/v1/base_controller.rb` | §3, §4, §5 |
| C3 | Factory + request specs | `spec/factories/properties.rb`, `spec/requests/api/v1/properties_spec.rb` | §6 |
| C4 | Coverage ratchet bump + docs sync | `backend/spec/spec_helper.rb`, `ai-docs/PLAN.md`, `ai-docs/SCHEMA.md`, `homeworks/hw-1/report.md`, `CLAUDE.md`, опционально `ai-docs/DECISIONS.md` и `homeworks/hw-1/PROMPTS.md` | §7, §8 |

Перед каждым коммитом — `bundle exec rspec` и `bundle exec rubocop` локально.
Stage показывается пользователю, ждём подтверждения.

---

## 1. Миграция `create_properties`

**Файл (новый):** `backend/db/migrate/<timestamp>_create_properties.rb`
(timestamp генерируется через `bin/rails g migration` или вручную в формате
`YYYYMMDDHHMMSS`).

**Содержимое:**

```ruby
class CreateProperties < ActiveRecord::Migration[8.1]
  def change
    create_table :properties do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false, limit: 255
      t.string :address, null: false, limit: 500
      t.integer :property_type, null: false
      t.text :description

      t.timestamps
    end

    add_index :properties, [ :organization_id, :id ]
  end
end
```

**Обоснования:**

- `t.references organization` создаёт `organization_id` + индекс + FK. `null: false` и DB-level FK реализуют инвариант 3.4.1 из Spec.
- `on_delete: :cascade` согласуется с `Organization has_many :properties, dependent: :destroy` (§3.3 Spec).
- `property_type` — integer, потому что Rails enum хранит так (Spec §3.2 фиксирует строковую сериализацию).
- `limit: 255` / `limit: 500` синхронны с валидациями модели (§7 Spec) и обеспечивают защиту на DB-уровне.
- Composite-индекс `[organization_id, id]` пригодится для `Current.organization.properties.find_by(id: ...)` (стандартный паттерн scope+find), мизерная стоимость и явная подсказка планировщику.
- Не трогаем существующие миграции (constraint CLAUDE.md).

**Команды:**

```bash
cd backend
bin/rails g migration CreateProperties \
  organization:references name:string address:string property_type:integer description:text
# Затем вручную привести содержимое к виду выше (limit, on_delete, индекс).
bin/rails db:migrate
bin/rails db:migrate RAILS_ENV=test
```

**Acceptance шага:**

- `db/schema.rb` обновлён, содержит таблицу `properties` с указанными колонками, FK и индексом. `db/schema.rb` коммитится вместе с файлом миграции (стандартная практика Rails).
- `bin/rails db:migrate:status` показывает миграцию как `up` в `development` и `test` окружениях.

---

## 2. Модель `Property`

**Файл (новый):** `backend/app/models/property.rb`

```ruby
class Property < ApplicationRecord
  belongs_to :organization

  enum :property_type, { apartment: 0, hotel: 1, house: 2, hostel: 3 }

  normalizes :name, with: ->(v) { v.to_s.strip }
  normalizes :address, with: ->(v) { v.to_s.strip }

  validates :name, presence: true, length: { maximum: 255 }
  validates :address, presence: true, length: { maximum: 500 }
  validates :property_type, presence: true
  validates :description, length: { maximum: 5000 }, allow_blank: true
end
```

**Изменение существующего файла:** `backend/app/models/organization.rb`

Добавить в блок ассоциаций (после `has_many :roles, dependent: :destroy`):

```ruby
has_many :properties, dependent: :destroy
```

**Обоснования:**

- `enum` без позиционного вызова — синтаксис Rails 8 (как в `Membership`).
  Целочисленное хранение, строковое API — соответствует §3.2 Spec.
- `normalizes` — Rails 8 встроенный механизм (используется в `Organization#name`),
  обеспечивает «без ведущих/хвостовых пробелов» (Spec §3.1) единообразно
  с проектом.
- `belongs_to :organization` без `optional: true` → автоматически
  валидация присутствия (`Organization must exist`) → инвариант 3.4.1.
- Иммутабельность `organization_id` (инвариант 3.4.2) реализуется через
  отсутствие `organization_id` в `permitted_params` контроллера (§3),
  а не в модели — это согласуется с проектным стилем (см. RolesController,
  где scoping тоже на уровне контроллера).
- Длины (255/500/5000) синхронны с миграцией и Spec §7.

**Шаги:**

1. Создать файл `app/models/property.rb` с содержимым выше.
2. Добавить ассоциацию в `app/models/organization.rb`.
3. `bundle exec rubocop -A app/models/property.rb app/models/organization.rb`.

**Acceptance шага:**

- В консоли `bin/rails c`: `Property.new.tap(&:valid?).errors.full_messages`
  возвращает ошибки на `name`, `address`, `property_type`, `organization`.
- `Property.property_types.keys` == `["apartment", "hotel", "house", "hostel"]`.

**Здесь делается коммит C1.**

---

## 3. Pundit policy `PropertyPolicy`

**Файл (новый):** `backend/app/policies/property_policy.rb`

```ruby
class PropertyPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("properties.view")
  end

  def show?
    Current.membership&.can?("properties.view")
  end

  def create?
    Current.membership&.can?("properties.manage")
  end

  def update?
    Current.membership&.can?("properties.manage")
  end

  def destroy?
    Current.membership&.can?("properties.manage")
  end
end
```

**Обоснования:**

- Точно повторяет shape `RolePolicy` — это и есть «reference pattern» для F2–F5.
- `Current.membership&.can?(...)` — проектный helper, owner-membership
  возвращает `true` всегда (см. `Membership#can?`).
- Pundit Scope не определяем — index возвращает `Current.organization.properties`
  напрямую (см. §4), что точно совпадает с паттерном `RolesController#index`.
  Если в будущем понадобится фильтрация по permissions внутри scope —
  добавится отдельной фичей.

**Acceptance шага:**

- `rubocop` зелёный.
- Файл синтаксически грузится: `bin/rails runner 'PropertyPolicy.new(nil, nil)'`.
- Итоговая поведенческая верификация — через request specs §7.2 (блоки AC3, AC4).

---

## 4. Глобальный `rescue_from Pundit::NotAuthorizedError`

**Изменение существующего файла:** `backend/app/controllers/api/v1/base_controller.rb`

```ruby
module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      before_action :set_current_organization

      rescue_from Pundit::NotAuthorizedError, with: :forbidden

      private

      def forbidden
        render json: { error: "Forbidden" }, status: :forbidden
      end
    end
  end
end
```

**Обоснования:**

- Без этого `rescue_from` любая `authorize Property` → 500 (текущий
  проект эту ситуацию не обрабатывает; в существующем коде RolesController
  никогда не падал, потому что нет тестов на forbidden и owner всегда
  проходит).
- Минимальный, безопасный, обратносовместимый: ничего не ломает в
  существующих контроллерах (там Pundit либо проходит, либо возвращает
  true).
- Соответствует AC3, AC4 Spec.
- Это **проектное улучшение**, побочный эффект F1; в `report.md` отметим
  как «hardening» и опционально внесём DEC-NNN, если посчитаем
  архитектурно значимым.

**Acceptance шага:**

- Существующие тесты (health spec) продолжают проходить — регрессии нет.
- Итоговая верификация `rescue_from` — через тесты §7.2: все сценарии
  ожидающие `403` (AC3 viewer forbids create/update/destroy, AC4
  no-permission) опираются именно на этот rescue.

---

## 5. Контроллер `Api::V1::PropertiesController`

**Файл (новый):** `backend/app/controllers/api/v1/properties_controller.rb`

```ruby
module Api
  module V1
    class PropertiesController < BaseController
      def index
        authorize Property
        properties = Current.organization.properties.order(:id)
        render json: properties.map { |p| property_json(p) }
      end

      def show
        property = find_property
        return if performed?

        authorize property
        render json: property_json(property)
      end

      def create
        authorize Property
        property = Current.organization.properties.new(property_params)
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

        if property.update(property_params)
          render json: property_json(property)
        else
          render json: { error: property.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        property = find_property
        return if performed?

        authorize property
        property.destroy!
        head :no_content
      end

      private

      def find_property
        property = Current.organization.properties.find_by(id: params[:id])
        unless property
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        property
      end

      def property_params
        params.require(:property).permit(:name, :address, :property_type, :description)
      end

      def property_json(property)
        {
          id: property.id,
          organization_id: property.organization_id,
          name: property.name,
          address: property.address,
          property_type: property.property_type,
          description: property.description,
          created_at: property.created_at,
          updated_at: property.updated_at
        }
      end
    end
  end
end
```

**Обоснования (по пунктам Spec):**

- `Current.organization.properties.find_by(id: ...)` — реализует инвариант
  3.4.5 и сценарии E5/E7/E8 (`404` на чужой id) **без** глобального
  `rescue_from RecordNotFound`. Это меньший blast radius, чем
  глобальный rescue.
- `property_params` не разрешает `organization_id` → инвариант 3.4.2
  (E12, E13, AC8).
- `Current.organization.properties.create!(...)` подставляет
  `organization_id` автоматически из association → AC8 для create.
- `authorize Property` (класс) на `index`/`create` и `authorize property`
  (instance) на `show`/`update`/`destroy` — стандартный Pundit-паттерн,
  совместимый с PropertyPolicy §3.
- `property_json` явно перечисляет поля → стабильный JSON-контракт §6,
  AC9.
- `property_type` отдаётся как строка, потому что Rails enum getter
  возвращает строковое имя → §3.2.
- Обработка ошибок валидации — через `if .save` / `if .update` единообразно
  в `create` и `update`. Это сознательное отклонение от RolesController
  (который использует `rescue RecordInvalid` в create и `if .update` в
  update): для reference-реализации F1 выбираем один стиль, чтобы F2–F5
  копировали его без путаницы. Control flow через исключения
  оправдан только для редких путей, а валидация на create — штатный путь.
- `performed?` — стандартный Rails-метод, проверяет, что `render`/`head`
  уже вызывались. Защищает от двойного render после `find_property`
  возврата.

**Acceptance шага:**

- `rubocop` зелёный.
- `bin/rails runner 'Api::V1::PropertiesController'` грузится без ошибок.
- Итоговая поведенческая верификация — полный прогон §7.2 зелёный.

---

## 6. Routes

**Изменение существующего файла:** `backend/config/routes.rb`

В блок `namespace :v1 do ... end`, после `resources :roles, ...`:

```ruby
resources :properties, only: [ :index, :show, :create, :update, :destroy ]
```

**Обоснования:**

- `only:` ограничивает набор — `new`/`edit` не нужны для API.
- Согласуется со Spec §5 (5 эндпоинтов).
- `PATCH/PUT` на `update` — Rails `resources` даёт оба, тесты используют PATCH.

**Acceptance шага:**

- `bin/rails routes -g properties` показывает 5 маршрутов.
- `bundle exec rspec` (после C2) зелёный.

**Здесь делается коммит C2 (controller + policy + routes + base_controller rescue).**

---

## 7. Factory + Request specs

### 7.1. Factory

**Файл (новый):** `backend/spec/factories/properties.rb`

```ruby
FactoryBot.define do
  factory :property do
    organization
    sequence(:name) { |n| "Property #{n}" }
    address { "1 Test Street" }
    property_type { :apartment }
    description { "Test description" }
  end
end
```

**Обоснования:**

- `organization` ассоциация автоматически создаёт связанную Organization
  (как в `:role` factory).
- `sequence(:name)` гарантирует уникальные имена при множественном создании.
- `property_type { :apartment }` — символ, Rails enum принимает.

### 7.2. Request spec

**Файл (новый):** `backend/spec/requests/api/v1/properties_spec.rb`

Структура тестов (RSpec, перечисление контекстов и примеров — без полного
кода):

```text
RSpec.describe "Api::V1::Properties" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  # ----- AC5: Unauthenticated -----
  describe "without auth token" do
    it "returns 401 for index"
    it "returns 401 for show"
    it "returns 401 for create"
    it "returns 401 for update"
    it "returns 401 for destroy"
  end

  # ----- AC11: missing X-Organization-Id -----
  describe "without X-Organization-Id" do
    it "returns 422 with 'Organization not selected'"
  end

  # ----- AC1: Happy path CRUD as owner -----
  describe "GET /api/v1/properties" do
    it "returns [] for empty organization" # AC1, E14
    it "returns properties of current organization sorted by id" # AC1
  end

  describe "GET /api/v1/properties/:id" do
    it "returns the property as JSON with all keys" # AC1, AC9
    it "returns 404 for non-existing id" # E6
  end

  describe "POST /api/v1/properties" do
    it "creates a property with valid attributes and returns 201" # AC1
    it "accepts description as null" # Spec §3.1
    it "accepts description as empty string" # Spec §3.1
    it "returns property_type as a string in JSON" # AC9, Spec §6
    it "returns JSON with exactly the documented set of keys" # AC9
    it "ignores organization_id passed in body" # AC8, E12
    it "returns 422 when name is blank" # E9, AC6
    it "returns 422 when property_type is invalid" # E10
    it "returns 400 when 'property' key is missing" # E11
  end

  describe "PATCH /api/v1/properties/:id" do
    it "updates allowed attributes and returns 200" # AC1
    it "ignores organization_id passed in body" # AC8, E13
    it "returns 422 when name is set to blank" # AC7
    it "returns 404 for non-existing id" # E6
  end

  describe "DELETE /api/v1/properties/:id" do
    it "deletes the property and returns 204" # AC1
    it "returns 404 for non-existing id" # E6
  end

  # ----- AC2: Organization isolation -----
  context "with another organization's property" do
    let(:other_org) { create(:organization) }
    let!(:other_property) { create(:property, organization: other_org) }

    it "is not visible in index" # AC2, E15
    it "show returns 404" # AC2, E5
    it "update returns 404" # AC2, E7
    it "destroy returns 404" # AC2, E8
  end

  # ----- AC3: Read-only viewer -----
  context "as a viewer (properties.view only)" do
    let(:viewer_user) { create(:user) }
    let(:viewer_role) { organization.roles.find_by(code: "viewer") }
    let!(:viewer_membership) do
      create(:membership, user: viewer_user, organization: organization,
                          role: viewer_role, role_enum: :member)
    end
    let(:viewer_headers) { auth_headers(viewer_user, organization) }

    it "allows index" # AC3
    it "allows show" # AC3
    it "forbids create with 403" # AC3
    it "forbids update with 403" # AC3
    it "forbids destroy with 403" # AC3
  end

  # ----- AC4: No-permission user -----
  context "as a member without any property permissions" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "forbids index with 403" # AC4
    it "forbids show with 403" # AC4
    it "forbids create with 403" # AC4
  end
end
```

**Обоснования:**

- Каждый `it` явно ссылается на AC/E из Spec в комментарии — обратная
  трассируемость Spec→Test.
- Используются существующие фабрики (`:user`, `:organization`,
  `:membership` с трейтами `:owner`/`:manager`) и `auth_headers` helper.
- Для AC3 (viewer) используется preset role `viewer`, которая
  автогенерируется в `Organization#create_preset_roles` → не нужна новая
  фабрика.
- Для AC4 (no-permission) `role_enum: :member` без `role:` → `can?`
  вернёт false для всего (см. `Membership#can?`).
- Для AC2 — два разных пользователя, два разных org, изоляция через
  смену `headers`.
- Тесты на 401 не используют `headers` вообще → `current_user` nil →
  `authenticate_user!` рендерит 401.
- Total ожидаемое количество примеров: ~30. Это даст значимый bump
  coverage для подъёма ratchet.

**Acceptance шага:**

- `bundle exec rspec spec/requests/api/v1/properties_spec.rb` — все примеры
  зелёные.
- `bundle exec rspec` — общий suite зелёный.
- `bundle exec rubocop` — зелёный (правила omakase для тестов могут
  быть мягче, но всё равно проверяем).

**Здесь делается коммит C3.**

---

## 8. Coverage ratchet bump

**Изменение существующего файла:** `backend/spec/spec_helper.rb`

После прогона полного `bundle exec rspec` посмотреть значение `Line Coverage`
в выводе SimpleCov, посчитать `floor(actual) - 1`, обновить:

```ruby
minimum_coverage line: <new_floor>
```

**Обоснования:**

- Правило ratchet из `WORKING_AGREEMENTS.md` § «Coverage ratchet».
- Буфер `-1` против флейков.
- Старт F1: 38. Ожидаемое после F1: ~50–55% (грубая оценка: ~30 новых
  тестов на ~80 строк controller+policy+model добавят значительный line
  hit), новый floor → 49–54.

**Acceptance шага:**

- `bundle exec rspec` зелёный с новым `minimum_coverage`.

---

## 9. Documentation sync

После того как реализация и тесты зелёные, обновить (всё в одном коммите C4
вместе с ratchet bump §8):

### 9.1. `ai-docs/PLAN.md`

Отметить как `[x]`:

- `2.1.1` Модель Property (с ремаркой «branch_id отложен в F5»)
- `2.2.1` CRUD `/api/v1/properties`

`2.2.6` («Pundit-политики для properties и units») **не отмечается** —
он покрыт только наполовину (PropertyPolicy есть, UnitPolicy нет).
Будет отмечен в F2 после добавления UnitPolicy.

### 9.2. `ai-docs/SCHEMA.md`

В разделе **Phase 2: Properties & Units** заменить `_Not yet implemented_`
на блок Property:

```markdown
#### Property

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null, on_delete: cascade |
| name | string(255) | not null, normalized strip |
| address | string(500) | not null, normalized strip |
| property_type | integer (enum) | not null |
| description | text | optional, max 5000 chars |

**Associations:** belongs_to :organization
**Enums:** property_type: { apartment: 0, hotel: 1, house: 2, hostel: 3 }
**Indexes:** [organization_id, id]

> branch_id intentionally omitted in F1; added in F5 (Property↔Branch).
```

### 9.3. `ai-docs/DECISIONS.md`

Опциональное **DEC-012**, если решим, что добавление
`rescue_from Pundit::NotAuthorizedError` в `BaseController` —
архитектурное решение, а не «hardening». Решим во время C4 на основе
размера изменения. Дефолт — **не добавлять DEC**, упомянуть в
`report.md` секции «Что пошло хорошо».

### 9.4. `homeworks/hw-1/report.md`

- Заполнить блок «01 — Property CRUD (эталон)»: время Brief+Spec+Plan,
  итерации ревью (Brief 1, Spec 2, Plan TBD), что хорошо/плохо/изменить
  в промптах.
- Обновить строку фичи `1` в сводной таблице: `Issue=#10`, `B→S→P=1/2/?`,
  статус=done.
- Добавить строку в таблицу «Coverage ratchet»: `После F1 | <new_floor> |
  <actual>% | bumped`.

### 9.5. `CLAUDE.md`

Добавить новую секцию **Reference implementations** (после `## Constraints`
или перед HW-1 секцией — выберем при коммите):

```markdown
## Reference implementations (HW-1 F1)

Эталонные паттерны, на которые ориентируются F2–F5:

- CRUD controller: `app/controllers/api/v1/properties_controller.rb`
- Pundit policy: `app/policies/property_policy.rb`
- Request spec: `spec/requests/api/v1/properties_spec.rb`
- Factory: `spec/factories/properties.rb`
```

### 9.6. `homeworks/hw-1/PROMPTS.md`

Если по итогам F1 стало понятно, как улучшить базовые промпты ревью
(Brief/Spec/Plan), сохранить v2-версии в секцию «Адаптированные».
Кандидаты v2:

- Spec review v2: добавить пункт «убедиться, что Spec не делегирует
  `(наследуется от существующего поведения)` без указания конкретных
  кодов и тел ответа».
- Plan review v2: добавить пункт «каждый шаг ссылается на конкретный
  пункт Spec / AC».

Решение конкретных правок — во время C4.

**Здесь делается коммит C4.**

---

## 10. Verify (после всех коммитов)

```bash
cd backend
bundle exec rubocop
bundle exec rspec
```

Оба зелёные, line coverage ≥ новый ratchet floor.

```bash
git push origin hw-1
```

После пуша — проверить, что CI на ветке `hw-1` зелёный (PR #6 draft).

---

## 11. Зависимости и предусловия

- Все §1–§6 предусловия (existing models, helpers, factories) проверены
  при написании Plan (см. Spec §12).
- Никаких новых gems.
- Никаких изменений миграций кроме новой `create_properties`.

## 12. Открытые вопросы

_(Будут добавлены по итогам ревью.)_
