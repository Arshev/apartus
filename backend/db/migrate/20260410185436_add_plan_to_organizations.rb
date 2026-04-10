class AddPlanToOrganizations < ActiveRecord::Migration[8.1]
  def change
    add_column :organizations, :plan, :string, null: false, default: "starter", limit: 20
  end
end
