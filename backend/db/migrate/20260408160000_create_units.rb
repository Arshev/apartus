class CreateUnits < ActiveRecord::Migration[8.1]
  def change
    create_table :units do |t|
      t.references :property, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false, limit: 255
      t.integer :unit_type, null: false
      t.integer :capacity, null: false
      t.integer :status, null: false

      t.timestamps
    end

    add_index :units, [ :property_id, :id ]
  end
end
