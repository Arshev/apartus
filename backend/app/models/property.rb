class Property < ApplicationRecord
  belongs_to :organization

  enum :property_type, { apartment: 0, hotel: 1, house: 2, hostel: 3 }, validate: true

  normalizes :name, with: ->(v) { v.to_s.strip }
  normalizes :address, with: ->(v) { v.to_s.strip }

  validates :name, presence: true, length: { maximum: 255 }
  validates :address, presence: true, length: { maximum: 500 }
  validates :property_type, presence: true
  validates :description, length: { maximum: 5000 }, allow_blank: true
end
