class Membership < ApplicationRecord
  belongs_to :user
  belongs_to :organization
  belongs_to :role, optional: true

  enum :role_enum, { member: 0, manager: 1, owner: 2 }

  validates :user_id, uniqueness: { scope: :organization_id }

  def can?(permission)
    return true if owner?
    return role.has_permission?(permission) if role.present?

    false
  end

  def permissions
    return Permissions::ALL_PERMISSIONS if owner?
    return role.permissions if role.present?

    []
  end
end
