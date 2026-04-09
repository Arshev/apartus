class AmenityPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("amenities.view")
  end

  def show?
    Current.membership&.can?("amenities.view")
  end

  def create?
    Current.membership&.can?("amenities.manage")
  end

  def update?
    Current.membership&.can?("amenities.manage")
  end

  def destroy?
    Current.membership&.can?("amenities.manage")
  end
end
