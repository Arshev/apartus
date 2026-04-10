class CreateSeasonalPrices < ActiveRecord::Migration[8.1]
  def change
    create_table :seasonal_prices do |t|
      t.references :unit, null: false, foreign_key: { on_delete: :cascade }
      t.date :start_date, null: false
      t.date :end_date, null: false
      t.integer :price_cents, null: false, default: 0

      t.timestamps
    end

    add_index :seasonal_prices, [ :unit_id, :start_date, :end_date ]
  end
end
