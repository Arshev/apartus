class CreateRoles < ActiveRecord::Migration[8.1]
  def change
    create_table :roles do |t|
      t.references :organization, null: false, foreign_key: true
      t.string :name, null: false
      t.string :code, null: false
      t.text :permissions, array: true, default: []
      t.boolean :is_system, default: false

      t.timestamps
    end

    add_index :roles, [ :organization_id, :code ], unique: true
  end
end
