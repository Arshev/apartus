class AddBasePriceCentsToUnits < ActiveRecord::Migration[8.1]
  def change
    add_column :units, :base_price_cents, :integer, null: false, default: 0
  end
end
