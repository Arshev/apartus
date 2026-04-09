class Role < ApplicationRecord
  belongs_to :organization
  has_many :memberships, dependent: :nullify

  validates :name, presence: true
  validates :code, presence: true, uniqueness: { scope: :organization_id }

  def has_permission?(code)
    permissions.include?(code)
  end

  def set_permissions(codes)
    valid_codes = codes.select { |code| Permissions.valid?(code) }
    self.permissions = valid_codes.uniq
    save
  end
end
