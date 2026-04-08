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
