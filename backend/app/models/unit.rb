class Unit < ApplicationRecord
  belongs_to :property
  has_many :unit_amenities, dependent: :destroy
  has_many :amenities, through: :unit_amenities

  enum :unit_type, { room: 0, apartment: 1, bed: 2, studio: 3 }, validate: true
  enum :status,    { available: 0, maintenance: 1, blocked: 2 }, validate: true

  normalizes :name, with: ->(v) { v.to_s.strip }

  validates :name, presence: true, length: { maximum: 255 }
  validates :capacity,
            presence: true,
            numericality: { only_integer: true, greater_than_or_equal_to: 1, less_than_or_equal_to: 100 }
end
