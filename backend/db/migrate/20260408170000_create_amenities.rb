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
