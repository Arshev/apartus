class ExchangeRatePolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("currency_rates.manage")
  end

  def show?
    Current.membership&.can?("currency_rates.manage")
  end

  def create?
    Current.membership&.can?("currency_rates.manage")
  end

  def update?
    return false unless Current.membership&.can?("currency_rates.manage")
    mutable_record?
  end

  def destroy?
    update?
  end

  private

  # Mutate scope: only manual overrides belonging to current org. Global API rows
  # (organization_id IS NULL) are in read scope but denied for mutation.
  def mutable_record?
    record.source == "manual" &&
      record.organization_id == Current.organization&.id
  end

  class Scope < ApplicationPolicy::Scope
    def resolve
      return scope.none unless Current.organization
      scope.where(organization_id: [ nil, Current.organization.id ])
    end
  end
end
