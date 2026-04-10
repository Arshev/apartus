class AddOwnerToProperties < ActiveRecord::Migration[8.1]
  def change
    add_reference :properties, :owner, null: true, foreign_key: { on_delete: :nullify }
  end
end
