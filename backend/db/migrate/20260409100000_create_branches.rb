class CreateBranches < ActiveRecord::Migration[8.1]
  def change
    create_table :branches do |t|
      t.references :organization, null: false, foreign_key: { on_delete: :cascade }
      t.references :parent_branch,
                   null: true,
                   foreign_key: { to_table: :branches, on_delete: :restrict }
      t.string :name, null: false, limit: 100

      t.timestamps
    end

    add_index :branches,
              "organization_id, parent_branch_id, LOWER(name)",
              unique: true,
              where: "parent_branch_id IS NOT NULL",
              name: "index_branches_on_org_parent_lower_name"

    add_index :branches,
              "organization_id, LOWER(name)",
              unique: true,
              where: "parent_branch_id IS NULL",
              name: "index_branches_on_org_lower_name_root"
  end
end
