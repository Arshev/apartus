class Channel < ApplicationRecord
  belongs_to :unit

  enum :platform, { booking_com: 0, airbnb: 1, ostrovok: 2, other: 3 }, validate: true

  validates :ical_export_token, presence: true, uniqueness: true
  validates :platform, presence: true

  before_validation :generate_export_token, on: :create

  def ical_export_path
    "/api/v1/public/ical/#{ical_export_token}.ics"
  end

  private

  def generate_export_token
    self.ical_export_token ||= SecureRandom.urlsafe_base64(32)
  end
end
