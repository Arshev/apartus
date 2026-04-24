class AddPreferredCurrencyToOwners < ActiveRecord::Migration[8.1]
  def change
    add_column :owners, :preferred_currency, :string, limit: 3
  end
end
