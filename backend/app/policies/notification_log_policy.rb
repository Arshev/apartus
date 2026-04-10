class NotificationLogPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("reservations.view")
  end
end
