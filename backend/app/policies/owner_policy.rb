class OwnerPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("finance.view")
  end

  def show?
    Current.membership&.can?("finance.view")
  end

  def create?
    Current.membership&.can?("finance.manage")
  end

  def update?
    Current.membership&.can?("finance.manage")
  end

  def destroy?
    Current.membership&.can?("finance.manage")
  end

  def statement?
    Current.membership&.can?("finance.view")
  end
end
