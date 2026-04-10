class PricingRule < ApplicationRecord
  belongs_to :unit

  enum :rule_type, { length_discount: 0, last_minute: 1, occupancy_markup: 2 }, validate: true

  validates :discount_percent, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, allow_nil: true
  validates :markup_percent, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 200 }, allow_nil: true
  validates :min_nights, numericality: { greater_than: 0 }, if: :length_discount?
  validates :days_before, numericality: { greater_than: 0 }, if: :last_minute?
  validates :occupancy_threshold, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 100 }, if: :occupancy_markup?
end
