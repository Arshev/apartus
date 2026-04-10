class DashboardPolicy < ApplicationPolicy
  def show?
    Current.membership&.can?("finances.view")
  end
end
