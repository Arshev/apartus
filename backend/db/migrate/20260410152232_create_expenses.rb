class CreateExpenses < ActiveRecord::Migration[8.1]
  def change
    create_table :expenses do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.references :property, null: true, foreign_key: { on_delete: :nullify }
      t.integer :category, null: false, default: 0
      t.integer :amount_cents, null: false
      t.text :description
      t.date :expense_date, null: false

      t.timestamps
    end

    add_index :expenses, [ :organization_id, :expense_date ]
    add_index :expenses, :category
  end
end
