class CreateExchangeRates < ActiveRecord::Migration[8.1]
  def change
    create_table :exchange_rates do |t|
      t.string :base_currency, null: false, limit: 3
      t.string :quote_currency, null: false, limit: 3
      t.bigint :rate_x1e10, null: false
      t.date :effective_date, null: false
      t.string :source, null: false
      t.references :organization, foreign_key: true, null: true
      t.text :note

      t.timestamps
    end

    # Two partial unique indexes instead of one: PostgreSQL < 15 treats NULL
    # organization_id rows as distinct in a standard unique index, so global
    # API rows (organization_id IS NULL) would allow duplicates.
    add_index :exchange_rates,
              [ :base_currency, :quote_currency, :effective_date, :source ],
              unique: true,
              where: "organization_id IS NULL",
              name: "idx_exchange_rates_unique_global"

    add_index :exchange_rates,
              [ :base_currency, :quote_currency, :effective_date, :source, :organization_id ],
              unique: true,
              where: "organization_id IS NOT NULL",
              name: "idx_exchange_rates_unique_per_org"

    reversible do |dir|
      dir.up do
        execute <<~SQL
          ALTER TABLE exchange_rates
          ADD CONSTRAINT exchange_rates_source_tenancy_invariant
          CHECK (
            (source = 'api' AND organization_id IS NULL)
            OR
            (source = 'manual' AND organization_id IS NOT NULL)
          )
        SQL

        execute <<~SQL
          ALTER TABLE exchange_rates
          ADD CONSTRAINT exchange_rates_rate_positive
          CHECK (rate_x1e10 > 0)
        SQL

        execute <<~SQL
          ALTER TABLE exchange_rates
          ADD CONSTRAINT exchange_rates_base_differs_from_quote
          CHECK (base_currency <> quote_currency)
        SQL
      end

      dir.down do
        execute "ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_source_tenancy_invariant"
        execute "ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_rate_positive"
        execute "ALTER TABLE exchange_rates DROP CONSTRAINT IF EXISTS exchange_rates_base_differs_from_quote"
      end
    end
  end
end
