class Reservation < ApplicationRecord
  belongs_to :unit
  belongs_to :guest, optional: true

  enum :status, { confirmed: 0, checked_in: 1, checked_out: 2, cancelled: 3 }, validate: true

  validates :check_in, presence: true
  validates :check_out, presence: true
  validates :guests_count, presence: true, numericality: { greater_than_or_equal_to: 1, only_integer: true }
  validates :total_price_cents, numericality: { greater_than_or_equal_to: 0, only_integer: true }
  validate :check_out_after_check_in
  validate :no_overlapping_reservations, if: -> { active_status? && (check_in_changed? || check_out_changed? || unit_id_changed? || status_changed?) }

  def can_check_in?
    confirmed?
  end

  def can_check_out?
    checked_in?
  end

  def can_cancel?
    confirmed? || checked_in?
  end

  private

  def active_status?
    confirmed? || checked_in?
  end

  def check_out_after_check_in
    return if check_in.blank? || check_out.blank?
    errors.add(:check_out, "должна быть позже даты заезда") unless check_out > check_in
  end

  def no_overlapping_reservations
    return if check_in.blank? || check_out.blank? || unit_id.blank?
    return if check_out <= check_in

    scope = Reservation.where(unit_id: unit_id)
                       .where(status: [ :confirmed, :checked_in ])
                       .where("daterange(check_in, check_out) && daterange(?, ?)", check_in, check_out)
    scope = scope.where.not(id: id) if persisted?

    errors.add(:base, "Даты пересекаются с другим бронированием") if scope.exists?
  end
end
