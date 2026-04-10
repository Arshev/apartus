class OwnerPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("finances.view")
  end

  def show?
    Current.membership&.can?("finances.view")
  end

  def create?
    Current.membership&.can?("finances.manage")
  end

  def update?
    Current.membership&.can?("finances.manage")
  end

  def destroy?
    Current.membership&.can?("finances.manage")
  end

  def statement?
    Current.membership&.can?("finances.view")
  end
end
