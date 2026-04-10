class CreateOwners < ActiveRecord::Migration[8.1]
  def change
    create_table :owners do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.string :name, null: false, limit: 255
      t.string :email, limit: 255
      t.string :phone, limit: 50
      t.integer :commission_rate, null: false, default: 0
      t.text :notes

      t.timestamps
    end
  end
end
