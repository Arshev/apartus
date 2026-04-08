class OrganizationPolicy < ApplicationPolicy
  def show?
    Current.membership.present?
  end

  def update?
    Current.membership&.owner?
  end
end
