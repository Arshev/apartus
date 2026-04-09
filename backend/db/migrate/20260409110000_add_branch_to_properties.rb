class AddBranchToProperties < ActiveRecord::Migration[8.1]
  def change
    add_reference :properties, :branch,
                  null: true,
                  foreign_key: { to_table: :branches, on_delete: :restrict }
  end
end
