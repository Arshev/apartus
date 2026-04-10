class AddCurrencyToOrganizations < ActiveRecord::Migration[8.1]
  def change
    add_column :organizations, :currency, :string, null: false, default: "RUB", limit: 3
  end
end
