class DashboardPolicy < ApplicationPolicy
  def show?
    Current.membership&.can?("finance.view")
  end
end
