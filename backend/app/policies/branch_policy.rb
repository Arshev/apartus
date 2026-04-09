class BranchPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("branches.view")
  end

  def show?
    Current.membership&.can?("branches.view")
  end

  def create?
    Current.membership&.can?("branches.manage")
  end

  def update?
    Current.membership&.can?("branches.manage")
  end

  def destroy?
    Current.membership&.can?("branches.manage")
  end
end
