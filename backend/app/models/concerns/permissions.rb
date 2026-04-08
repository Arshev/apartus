module Permissions
  ALL_PERMISSIONS = [
    "organizations.manage",
    "organizations.view",
    "members.manage",
    "members.view",
    "roles.manage",
    "properties.manage",
    "properties.view",
    "units.manage",
    "units.view",
    "reservations.manage",
    "reservations.view",
    "finance.manage",
    "finance.view",
    "settings.manage"
  ].freeze

  PRESET_ROLES = {
    admin: {
      name: "Администратор",
      permissions: ALL_PERMISSIONS
    },
    manager: {
      name: "Менеджер",
      permissions: %w[
        organizations.view
        members.view
        properties.manage properties.view
        units.manage units.view
        reservations.manage reservations.view
        finance.view
      ]
    },
    viewer: {
      name: "Просмотр",
      permissions: %w[
        organizations.view
        members.view
        properties.view
        units.view
        reservations.view
        finance.view
      ]
    }
  }.freeze

  def self.valid?(code)
    ALL_PERMISSIONS.include?(code)
  end
end
