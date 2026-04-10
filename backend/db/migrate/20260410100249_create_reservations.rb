class CreateReservations < ActiveRecord::Migration[8.1]
  def change
    enable_extension "btree_gist" unless extension_enabled?("btree_gist")

    create_table :reservations do |t|
      t.references :unit, null: false, foreign_key: { on_delete: :cascade }
      t.references :guest, null: true, foreign_key: { on_delete: :nullify }
      t.date :check_in, null: false
      t.date :check_out, null: false
      t.integer :status, null: false, default: 0
      t.integer :guests_count, null: false, default: 1
      t.integer :total_price_cents, null: false, default: 0
      t.text :notes

      t.timestamps
    end

    add_index :reservations, :status
    add_index :reservations, [ :unit_id, :check_in, :check_out ]

    # Exclusion constraint: no overlapping confirmed/checked_in reservations per unit.
    # Uses daterange with && (overlap) operator. Requires btree_gist.
    reversible do |dir|
      dir.up do
        execute <<~SQL
          ALTER TABLE reservations
          ADD CONSTRAINT no_overlapping_reservations
          EXCLUDE USING gist (
            unit_id WITH =,
            daterange(check_in, check_out) WITH &&
          )
          WHERE (status IN (0, 1));
        SQL
      end
      dir.down do
        execute "ALTER TABLE reservations DROP CONSTRAINT IF EXISTS no_overlapping_reservations;"
      end
    end
  end
end
