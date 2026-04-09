# Apartus — Data Schema

> Единый справочник по моделям, полям и связям.
> Обновляется при каждом изменении структуры БД.

---

## Conventions

- Money fields: integer with `_cents` suffix (e.g. `total_cents`)
- Enums: Rails enums, stored as integers
- Timestamps: `created_at`, `updated_at` on all tables
- Foreign keys: `belongs_to` with DB-level constraints
- Soft delete: not used unless explicitly decided (see DECISIONS.md)
- UUIDs: not used, standard bigint PKs

---

## Models

> Models are grouped by phase. Each model lists fields, associations, and enums.
> Format: `field_name : type (constraint/default)` — associations listed separately.

### Phase 1: Auth & Multi-tenancy

#### User

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| email | string | unique, not null |
| password_digest | string | not null (bcrypt) |
| first_name | string | not null |
| last_name | string | not null |
| settings | jsonb | default: {} |

**Associations:** has_many :memberships, has_many :organizations through :memberships
**Validations:** email presence/uniqueness/format, name presence, password min 8

#### Organization

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| name | string | not null |
| slug | string | unique, not null, auto-generated |
| settings | jsonb | default: {} |

**Associations:** has_many :memberships, has_many :users through :memberships, has_many :roles, has_many :properties, has_many :units through :properties, has_many :amenities, has_many :branches
**Callbacks:** before_validation :generate_slug, after_create :create_preset_roles

#### Membership

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| user_id | bigint | FK, not null |
| organization_id | bigint | FK, not null |
| role_id | bigint | FK, optional |
| role_enum | integer | default: 0 (member) |

**Associations:** belongs_to :user, belongs_to :organization, belongs_to :role (optional)
**Enums:** role_enum: { member: 0, manager: 1, owner: 2 }
**Unique index:** [user_id, organization_id]

#### Role

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null |
| name | string | not null |
| code | string | not null |
| permissions | text[] | PostgreSQL array, default: [] |
| is_system | boolean | default: false |

**Associations:** belongs_to :organization, has_many :memberships
**Unique index:** [organization_id, code]

#### JwtDenylist

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| jti | string | unique, not null |
| exp | datetime | not null |

**Unique index:** jti

#### Branch

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null, on_delete: cascade |
| parent_branch_id | bigint | self-FK, nullable, on_delete: restrict |
| name | string(100) | not null, normalized strip |

**Associations:** belongs_to :organization, belongs_to :parent_branch (class_name: "Branch", optional: true), has_many :children (class_name: "Branch", foreign_key: :parent_branch_id); `before_destroy` guards deletion when `children.exists?`
**Validations:** name presence + length + uniqueness (case-insensitive per `[organization_id, parent_branch_id]`); `parent_branch_must_exist_in_org`; `parent_is_not_self`; `parent_is_not_descendant` (on :update)
**Indexes:** [organization_id], [parent_branch_id], two partial unique indexes: `(organization_id, parent_branch_id, LOWER(name)) WHERE parent_branch_id IS NOT NULL` and `(organization_id, LOWER(name)) WHERE parent_branch_id IS NULL`

> Adjacency list tree (DEC-014). Cross-org isolation of `parent_branch_id` enforced at the controller level via scope resolution — see Spec F4 §5.3 ANTI-PATTERN.

<!-- Template:
#### ModelName
| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |

**Associations:** belongs_to :x, has_many :y
**Enums:** status: { active: 0, archived: 1 }
**Validations:** presence, uniqueness, etc.
-->

### Phase 2: Properties & Units

#### Property

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null, on_delete: cascade |
| name | string(255) | not null, normalized strip |
| address | string(500) | not null, normalized strip |
| property_type | integer (enum) | not null |
| description | text | optional, max 5000 chars |

**Associations:** belongs_to :organization, has_many :units (dependent: :destroy)
**Enums:** property_type: { apartment: 0, hotel: 1, house: 2, hostel: 3 } (validated via `validate: true`)
**Validations:** name/address presence + length, description length <= 5000
**Indexes:** [organization_id], [organization_id, id]

> `branch_id` intentionally omitted in F1; added in F5 (Property↔Branch).

#### Unit

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| property_id | bigint | FK, not null, on_delete: cascade |
| name | string(255) | not null, normalized strip |
| unit_type | integer (enum) | not null |
| capacity | integer | not null, 1..100 |
| status | integer (enum) | not null |

**Associations:** belongs_to :property, has_many :unit_amenities (dependent: :destroy), has_many :amenities (through: :unit_amenities)
**Enums:** unit_type: { room: 0, apartment: 1, bed: 2, studio: 3 } (validated via `validate: true`); status: { available: 0, maintenance: 1, blocked: 2 } (validated via `validate: true`)
**Validations:** name presence + length, capacity presence + numericality 1..100
**Indexes:** [property_id], [property_id, id]

> `organization_id` intentionally not stored on Unit — derived via `unit.property.organization_id`. See Spec F2 §3.1, D3.

#### Amenity

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| organization_id | bigint | FK, not null, on_delete: cascade |
| name | string(100) | not null, normalized strip |

**Associations:** belongs_to :organization, has_many :unit_amenities, has_many :units (through: :unit_amenities); `before_destroy` callback guards deletion when any `unit_amenities` exist (returns 409 via controller)
**Validations:** name presence + length(<=100) + uniqueness (case-insensitive per organization)
**Indexes:** [organization_id], unique [organization_id, LOWER(name)]

> Per-org catalog. `organization_id` is immutable after create. No `description`/`icon`/`category` in HW-1 — see Spec F3 §13 D-open.

#### UnitAmenity (join)

| Field | Type | Notes |
|-------|------|-------|
| id | bigint | PK |
| unit_id | bigint | FK, not null, on_delete: cascade |
| amenity_id | bigint | FK, not null, on_delete: restrict |

**Associations:** belongs_to :unit, belongs_to :amenity
**Validations:** uniqueness of [unit_id, amenity_id]
**Indexes:** [unit_id], [amenity_id], unique [unit_id, amenity_id]

> DB-level `ON DELETE RESTRICT` on `amenity_id` is the second line of defense for the "amenity in use" invariant; the primary enforcement is `Amenity#before_destroy` for Rails-level custom error message.

### Phase 3: Booking Calendar

_Not yet implemented_

### Phase 4: Pricing

_Not yet implemented_

### Phase 5: Guests & CRM

_Not yet implemented_

### Phase 6: Payments & Finance

_Not yet implemented_

### Phase 7: Owners

_Not yet implemented_

### Phase 8: Tasks & Maintenance

_Not yet implemented_

### Phase 9: Booking Widget

_Not yet implemented_

### Phase 10: Channel Manager

_Not yet implemented_

### Phase 11: Communications

_Not yet implemented_

### Phase 12: Advanced Features

_Not yet implemented_

---

## ER Diagram (text)

> Updated as models are added. Mermaid syntax for rendering.

```mermaid
erDiagram
    User ||--o{ Membership : has
    Organization ||--o{ Membership : has
    Organization ||--o{ Role : has
    Membership }o--|| Role : "optional"
    Organization ||--o{ Branch : has
    Organization ||--o{ Property : has
    Branch ||--o{ Property : has
    Property ||--o{ Unit : has
    Unit ||--o{ Reservation : has
```
