class MembershipPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("members.view")
  end

  def create?
    Current.membership&.can?("members.manage")
  end

  def update?
    Current.membership&.can?("members.manage")
  end

  def destroy?
    Current.membership&.can?("members.manage") && record != Current.membership
  end
end
