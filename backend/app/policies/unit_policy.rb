class UnitPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("units.view")
  end

  def show?
    Current.membership&.can?("units.view")
  end

  def create?
    Current.membership&.can?("units.manage")
  end

  def update?
    Current.membership&.can?("units.manage")
  end

  def destroy?
    Current.membership&.can?("units.manage")
  end
end
