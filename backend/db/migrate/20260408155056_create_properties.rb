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
