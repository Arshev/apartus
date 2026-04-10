class PhotoPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("properties.view")
  end

  def create?
    Current.membership&.can?("properties.manage")
  end

  def destroy?
    Current.membership&.can?("properties.manage")
  end
end
