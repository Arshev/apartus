class UnitAmenityPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("units.view") &&
      Current.membership&.can?("amenities.view")
  end

  def create?
    Current.membership&.can?("units.manage")
  end

  def destroy?
    Current.membership&.can?("units.manage")
  end
end
