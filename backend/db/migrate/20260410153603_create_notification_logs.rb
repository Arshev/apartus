class CreateNotificationLogs < ActiveRecord::Migration[8.1]
  def change
    create_table :notification_logs do |t|
      t.references :reservation, null: false, foreign_key: { on_delete: :cascade }
      t.string :event_type, null: false
      t.string :channel, null: false, default: "email"
      t.string :recipient_email
      t.datetime :sent_at, null: false

      t.timestamps
    end

    add_index :notification_logs, [ :reservation_id, :event_type ]
  end
end
