class RenameNotificationLogSentAtToQueuedAt < ActiveRecord::Migration[8.1]
  def change
    rename_column :notification_logs, :sent_at, :queued_at
  end
end
