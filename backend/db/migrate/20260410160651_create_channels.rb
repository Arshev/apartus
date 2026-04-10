class CreateChannels < ActiveRecord::Migration[8.1]
  def change
    create_table :channels do |t|
      t.references :unit, null: false, foreign_key: { on_delete: :cascade }
      t.integer :platform, null: false, default: 0
      t.string :ical_export_token, null: false
      t.string :ical_import_url
      t.boolean :sync_enabled, null: false, default: true
      t.datetime :last_synced_at

      t.timestamps
    end

    add_index :channels, :ical_export_token, unique: true
    add_index :channels, [ :unit_id, :platform ]
  end
end
