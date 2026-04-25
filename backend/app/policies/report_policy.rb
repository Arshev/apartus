class ReportPolicy < ApplicationPolicy
  def financial?
    Current.membership&.can?("finance.view")
  end
end
