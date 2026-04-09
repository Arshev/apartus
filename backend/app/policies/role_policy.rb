class RolePolicy < ApplicationPolicy
  def index?
    Current.membership.present?
  end

  def create?
    Current.membership&.can?("roles.manage")
  end

  def update?
    Current.membership&.can?("roles.manage")
  end

  def destroy?
    Current.membership&.can?("roles.manage")
  end
end
