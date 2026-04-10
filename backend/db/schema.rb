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

ActiveRecord::Schema[8.1].define(version: 2026_04_10_160651) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "btree_gist"
  enable_extension "pg_catalog.plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.bigint "record_id", null: false
    t.string "record_type", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.string "content_type"
    t.datetime "created_at", null: false
    t.string "filename", null: false
    t.string "key", null: false
    t.text "metadata"
    t.string "service_name", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "amenities", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", limit: 100, null: false
    t.bigint "organization_id", null: false
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((name)::text)", name: "index_amenities_on_org_and_lower_name", unique: true
    t.index ["organization_id"], name: "index_amenities_on_organization_id"
  end

  create_table "branches", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", limit: 100, null: false
    t.bigint "organization_id", null: false
    t.bigint "parent_branch_id"
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((name)::text)", name: "index_branches_on_org_lower_name_root", unique: true, where: "(parent_branch_id IS NULL)"
    t.index "organization_id, parent_branch_id, lower((name)::text)", name: "index_branches_on_org_parent_lower_name", unique: true, where: "(parent_branch_id IS NOT NULL)"
    t.index ["organization_id"], name: "index_branches_on_organization_id"
    t.index ["parent_branch_id"], name: "index_branches_on_parent_branch_id"
  end

  create_table "channels", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "ical_export_token", null: false
    t.string "ical_import_url"
    t.datetime "last_synced_at"
    t.integer "platform", default: 0, null: false
    t.boolean "sync_enabled", default: true, null: false
    t.bigint "unit_id", null: false
    t.datetime "updated_at", null: false
    t.index ["ical_export_token"], name: "index_channels_on_ical_export_token", unique: true
    t.index ["unit_id", "platform"], name: "index_channels_on_unit_id_and_platform"
    t.index ["unit_id"], name: "index_channels_on_unit_id"
  end

  create_table "expenses", force: :cascade do |t|
    t.integer "amount_cents", null: false
    t.integer "category", default: 0, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.date "expense_date", null: false
    t.bigint "organization_id", null: false
    t.bigint "property_id"
    t.datetime "updated_at", null: false
    t.index ["category"], name: "index_expenses_on_category"
    t.index ["organization_id", "expense_date"], name: "index_expenses_on_organization_id_and_expense_date"
    t.index ["organization_id"], name: "index_expenses_on_organization_id"
    t.index ["property_id"], name: "index_expenses_on_property_id"
  end

  create_table "guests", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "email", limit: 255
    t.string "first_name", limit: 255, null: false
    t.string "last_name", limit: 255, null: false
    t.text "notes"
    t.bigint "organization_id", null: false
    t.string "phone", limit: 50
    t.datetime "updated_at", null: false
    t.index "organization_id, lower((email)::text)", name: "index_guests_on_org_lower_email", unique: true, where: "((email IS NOT NULL) AND ((email)::text <> ''::text))"
    t.index ["organization_id"], name: "index_guests_on_organization_id"
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

  create_table "notification_logs", force: :cascade do |t|
    t.string "channel", default: "email", null: false
    t.datetime "created_at", null: false
    t.string "event_type", null: false
    t.datetime "queued_at", null: false
    t.string "recipient_email"
    t.bigint "reservation_id", null: false
    t.datetime "updated_at", null: false
    t.index ["reservation_id", "event_type"], name: "index_notification_logs_on_reservation_id_and_event_type"
    t.index ["reservation_id"], name: "index_notification_logs_on_reservation_id"
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
    t.bigint "branch_id"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "name", limit: 255, null: false
    t.bigint "organization_id", null: false
    t.integer "property_type", null: false
    t.datetime "updated_at", null: false
    t.index ["branch_id"], name: "index_properties_on_branch_id"
    t.index ["organization_id", "id"], name: "index_properties_on_organization_id_and_id"
    t.index ["organization_id"], name: "index_properties_on_organization_id"
  end

  create_table "reservations", force: :cascade do |t|
    t.date "check_in", null: false
    t.date "check_out", null: false
    t.datetime "created_at", null: false
    t.bigint "guest_id"
    t.integer "guests_count", default: 1, null: false
    t.text "notes"
    t.integer "status", default: 0, null: false
    t.integer "total_price_cents", default: 0, null: false
    t.bigint "unit_id", null: false
    t.datetime "updated_at", null: false
    t.index ["guest_id"], name: "index_reservations_on_guest_id"
    t.index ["status"], name: "index_reservations_on_status"
    t.index ["unit_id", "check_in", "check_out"], name: "index_reservations_on_unit_id_and_check_in_and_check_out"
    t.index ["unit_id"], name: "index_reservations_on_unit_id"
    t.exclusion_constraint "unit_id WITH =, daterange(check_in, check_out) WITH &&", where: "status = ANY (ARRAY[0, 1])", using: :gist, name: "no_overlapping_reservations"
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

  create_table "seasonal_prices", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.date "end_date", null: false
    t.integer "price_cents", default: 0, null: false
    t.date "start_date", null: false
    t.bigint "unit_id", null: false
    t.datetime "updated_at", null: false
    t.index ["unit_id", "start_date", "end_date"], name: "index_seasonal_prices_on_unit_id_and_start_date_and_end_date"
    t.index ["unit_id"], name: "index_seasonal_prices_on_unit_id"
  end

  create_table "tasks", force: :cascade do |t|
    t.bigint "assigned_to_id"
    t.integer "category", default: 0, null: false
    t.datetime "created_at", null: false
    t.text "description"
    t.date "due_date"
    t.bigint "organization_id", null: false
    t.integer "priority", default: 1, null: false
    t.bigint "property_id"
    t.integer "status", default: 0, null: false
    t.string "title", limit: 255, null: false
    t.bigint "unit_id"
    t.datetime "updated_at", null: false
    t.index ["assigned_to_id"], name: "index_tasks_on_assigned_to_id"
    t.index ["organization_id", "status"], name: "index_tasks_on_organization_id_and_status"
    t.index ["organization_id"], name: "index_tasks_on_organization_id"
    t.index ["priority"], name: "index_tasks_on_priority"
    t.index ["property_id"], name: "index_tasks_on_property_id"
    t.index ["unit_id"], name: "index_tasks_on_unit_id"
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
    t.integer "base_price_cents", default: 0, null: false
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

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "amenities", "organizations", on_delete: :cascade
  add_foreign_key "branches", "branches", column: "parent_branch_id", on_delete: :restrict
  add_foreign_key "branches", "organizations", on_delete: :cascade
  add_foreign_key "channels", "units", on_delete: :cascade
  add_foreign_key "expenses", "organizations", on_delete: :cascade
  add_foreign_key "expenses", "properties", on_delete: :nullify
  add_foreign_key "guests", "organizations", on_delete: :cascade
  add_foreign_key "memberships", "organizations"
  add_foreign_key "memberships", "roles"
  add_foreign_key "memberships", "users"
  add_foreign_key "notification_logs", "reservations", on_delete: :cascade
  add_foreign_key "properties", "branches", on_delete: :restrict
  add_foreign_key "properties", "organizations", on_delete: :cascade
  add_foreign_key "reservations", "guests", on_delete: :nullify
  add_foreign_key "reservations", "units", on_delete: :cascade
  add_foreign_key "roles", "organizations"
  add_foreign_key "seasonal_prices", "units", on_delete: :cascade
  add_foreign_key "tasks", "organizations", on_delete: :cascade
  add_foreign_key "tasks", "properties", on_delete: :nullify
  add_foreign_key "tasks", "units", on_delete: :nullify
  add_foreign_key "tasks", "users", column: "assigned_to_id", on_delete: :nullify
  add_foreign_key "unit_amenities", "amenities", on_delete: :restrict
  add_foreign_key "unit_amenities", "units", on_delete: :cascade
  add_foreign_key "units", "properties", on_delete: :cascade
end
