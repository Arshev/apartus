class Amenity < ApplicationRecord
  belongs_to :organization
  has_many :unit_amenities
  has_many :units, through: :unit_amenities

  normalizes :name, with: ->(v) { v.to_s.strip }

  validates :name,
            presence: true,
            length: { maximum: 100 },
            uniqueness: { case_sensitive: false, scope: :organization_id }

  before_destroy :prevent_destroy_if_in_use

  private

  def prevent_destroy_if_in_use
    return unless unit_amenities.exists?

    errors.add(:base, "Amenity is in use and cannot be deleted")
    throw(:abort)
  end
end
