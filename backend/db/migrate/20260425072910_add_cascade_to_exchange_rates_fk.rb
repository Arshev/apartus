class AddCascadeToExchangeRatesFk < ActiveRecord::Migration[8.1]
  def up
    remove_foreign_key :exchange_rates, :organizations
    add_foreign_key :exchange_rates, :organizations, on_delete: :cascade
  end

  def down
    remove_foreign_key :exchange_rates, :organizations
    add_foreign_key :exchange_rates, :organizations
  end
end
