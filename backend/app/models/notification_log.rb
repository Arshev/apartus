class NotificationLog < ApplicationRecord
  belongs_to :reservation

  validates :event_type, presence: true
  validates :channel, presence: true
  validates :sent_at, presence: true
end
