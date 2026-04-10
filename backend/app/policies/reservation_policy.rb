class ReservationPolicy < ApplicationPolicy
  def index?
    Current.membership&.can?("reservations.view")
  end

  def show?
    Current.membership&.can?("reservations.view")
  end

  def create?
    Current.membership&.can?("reservations.manage")
  end

  def update?
    Current.membership&.can?("reservations.manage")
  end

  def destroy?
    Current.membership&.can?("reservations.manage")
  end

  def check_in?
    Current.membership&.can?("reservations.manage")
  end

  def check_out?
    Current.membership&.can?("reservations.manage")
  end

  def cancel?
    Current.membership&.can?("reservations.manage")
  end
end
