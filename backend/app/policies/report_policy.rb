class ReportPolicy < ApplicationPolicy
  def financial?
    Current.membership&.can?("finances.view")
  end
end
