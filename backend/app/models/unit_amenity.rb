class UnitAmenity < ApplicationRecord
  belongs_to :unit
  belongs_to :amenity

  validates :unit_id, uniqueness: { scope: :amenity_id }
end
