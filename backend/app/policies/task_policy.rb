class TaskPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("tasks.view")
  end

  def show?
    Current.membership&.can?("tasks.view")
  end

  def create?
    Current.membership&.can?("tasks.manage")
  end

  def update?
    Current.membership&.can?("tasks.manage")
  end

  def destroy?
    Current.membership&.can?("tasks.manage")
  end
end
