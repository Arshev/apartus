class GuestPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("guests.view")
  end

  def show?
    Current.membership&.can?("guests.view")
  end

  def create?
    Current.membership&.can?("guests.manage")
  end

  def update?
    Current.membership&.can?("guests.manage")
  end

  def destroy?
    Current.membership&.can?("guests.manage")
  end
end
