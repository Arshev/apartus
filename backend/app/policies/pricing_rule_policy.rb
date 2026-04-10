class PricingRulePolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("properties.view")
  end

  def create?
    Current.membership&.can?("properties.manage")
  end

  def update?
    Current.membership&.can?("properties.manage")
  end

  def destroy?
    Current.membership&.can?("properties.manage")
  end
end
