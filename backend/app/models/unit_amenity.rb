class UnitAmenity < ApplicationRecord
  belongs_to :unit
  belongs_to :amenity

  validates :amenity_id,
            uniqueness: { scope: :unit_id, message: "has already been attached" }
end
