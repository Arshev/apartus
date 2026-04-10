class Guest < ApplicationRecord
  belongs_to :organization
  has_many :reservations, dependent: :nullify

  normalizes :first_name, :last_name, with: ->(v) { v.strip }
  normalizes :email, with: ->(v) { v&.strip&.downcase }
  normalizes :phone, with: ->(v) { v&.strip }

  validates :first_name, presence: true, length: { maximum: 255 }
  validates :last_name, presence: true, length: { maximum: 255 }
  validates :email, length: { maximum: 255 },
                    uniqueness: { scope: :organization_id, case_sensitive: false, allow_blank: true }
  validates :phone, length: { maximum: 50 }

  def full_name
    "#{first_name} #{last_name}"
  end
end
