class Property < ApplicationRecord
  belongs_to :organization
  belongs_to :branch, optional: true
  belongs_to :owner, optional: true
  has_many :units, dependent: :destroy
  has_many_attached :photos

  enum :property_type, { apartment: 0, hotel: 1, house: 2, hostel: 3 }, validate: true

  normalizes :name, with: ->(v) { v.to_s.strip }
  normalizes :address, with: ->(v) { v.to_s.strip }

  validates :name, presence: true, length: { maximum: 255 }
  validates :address, presence: true, length: { maximum: 500 }
  validates :property_type, presence: true
  validates :description, length: { maximum: 5000 }, allow_blank: true

  validate :branch_must_exist_in_org

  private

  def branch_must_exist_in_org
    return if branch_id.blank?
    return if branch.present? && branch.organization_id == organization_id

    errors.add(:branch, "must exist")
  end
end
