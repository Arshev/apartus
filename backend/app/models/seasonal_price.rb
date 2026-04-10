class SeasonalPrice < ApplicationRecord
  belongs_to :unit

  validates :start_date, presence: true
  validates :end_date, presence: true
  validates :price_cents, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validate :end_date_after_start_date

  private

  def end_date_after_start_date
    return if start_date.blank? || end_date.blank?
    errors.add(:end_date, "должна быть позже начала") unless end_date > start_date
  end
end
