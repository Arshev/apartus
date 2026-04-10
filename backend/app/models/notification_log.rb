class NotificationLog < ApplicationRecord
  belongs_to :reservation

  validates :event_type, presence: true
  validates :channel, presence: true
  validates :queued_at, presence: true
end
