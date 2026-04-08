# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_04_08_170100) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "amenities", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", limit: 100, null: false
    t.bigint "organization_id", null: false
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((name)::text)", name: "index_amenities_on_org_and_lower_name", unique: true
    t.index ["organization_id"], name: "index_amenities_on_organization_id"
  end

  create_table "jwt_denylists", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "exp", null: false
    t.string "jti", null: false
    t.datetime "updated_at", null: false
    t.index ["jti"], name: "index_jwt_denylists_on_jti", unique: true
  end

  create_table "memberships", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.bigint "organization_id", null: false
    t.integer "role_enum", default: 0, null: false
    t.bigint "role_id"
    t.datetime "updated_at", null: false
    t.bigint "user_id", null: false
    t.index ["organization_id"], name: "index_memberships_on_organization_id"
    t.index ["role_id"], name: "index_memberships_on_role_id"
    t.index ["user_id", "organization_id"], name: "index_memberships_on_user_id_and_organization_id", unique: true
    t.index ["user_id"], name: "index_memberships_on_user_id"
  end

  create_table "organizations", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.jsonb "settings", default: {}
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["slug"], name: "index_organizations_on_slug", unique: true
  end

  create_table "properties", force: :cascade do |t|
    t.string "address", limit: 500, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", limit: 255, null: false
    t.bigint "organization_id", null: false
    t.integer "property_type", null: false
    t.datetime "updated_at", null: false
    t.index ["organization_id", "id"], name: "index_properties_on_organization_id_and_id"
    t.index ["organization_id"], name: "index_properties_on_organization_id"
  end

  create_table "roles", force: :cascade do |t|
    t.string "code", null: false
    t.datetime "created_at", null: false
    t.boolean "is_system", default: false
    t.string "name", null: false
    t.bigint "organization_id", null: false
    t.text "permissions", default: [], array: true
    t.datetime "updated_at", null: false
    t.index ["organization_id", "code"], name: "index_roles_on_organization_id_and_code", unique: true
    t.index ["organization_id"], name: "index_roles_on_organization_id"
  end

  create_table "unit_amenities", force: :cascade do |t|
    t.bigint "amenity_id", null: false
    t.datetime "created_at", null: false
    t.bigint "unit_id", null: false
    t.datetime "updated_at", null: false
    t.index ["amenity_id"], name: "index_unit_amenities_on_amenity_id"
    t.index ["unit_id", "amenity_id"], name: "index_unit_amenities_on_unit_id_and_amenity_id", unique: true
    t.index ["unit_id"], name: "index_unit_amenities_on_unit_id"
  end

  create_table "units", force: :cascade do |t|
    t.integer "capacity", null: false
    t.datetime "created_at", null: false
    t.string "name", limit: 255, null: false
    t.bigint "property_id", null: false
    t.integer "status", null: false
    t.integer "unit_type", null: false
    t.datetime "updated_at", null: false
    t.index ["property_id", "id"], name: "index_units_on_property_id_and_id"
    t.index ["property_id"], name: "index_units_on_property_id"
  end

  create_table "users", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", null: false
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.string "password_digest", null: false
    t.jsonb "settings", default: {}
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
  end

  add_foreign_key "amenities", "organizations", on_delete: :cascade
  add_foreign_key "memberships", "organizations"
  add_foreign_key "memberships", "roles"
  add_foreign_key "memberships", "users"
  add_foreign_key "properties", "organizations", on_delete: :cascade
  add_foreign_key "roles", "organizations"
  add_foreign_key "unit_amenities", "amenities", on_delete: :restrict
  add_foreign_key "unit_amenities", "units", on_delete: :cascade
  add_foreign_key "units", "properties", on_delete: :cascade
end
