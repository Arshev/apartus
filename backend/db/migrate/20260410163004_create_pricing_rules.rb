class CreatePricingRules < ActiveRecord::Migration[8.1]
  def change
    create_table :pricing_rules do |t|
      t.references :unit, null: false, foreign_key: { on_delete: :cascade }
      t.integer :rule_type, null: false, default: 0
      t.integer :min_nights
      t.integer :discount_percent, default: 0
      t.integer :days_before
      t.integer :occupancy_threshold
      t.integer :markup_percent, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :pricing_rules, [ :unit_id, :rule_type ]
  end
end
