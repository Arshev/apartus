class CreateTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :tasks do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.references :property, null: true, foreign_key: { on_delete: :nullify }
      t.references :unit, null: true, foreign_key: { on_delete: :nullify }
      t.references :assigned_to, null: true, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :title, null: false, limit: 255
      t.text :description
      t.integer :status, null: false, default: 0
      t.integer :priority, null: false, default: 1
      t.date :due_date
      t.integer :category, null: false, default: 0

      t.timestamps
    end

    add_index :tasks, [ :organization_id, :status ]
    add_index :tasks, :priority
  end
end
