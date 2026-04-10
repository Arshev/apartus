class GuestMailer < ApplicationMailer
  def booking_confirmation(reservation)
    @reservation = reservation
    @guest = reservation.guest
    return unless @guest&.email.present?

    mail(to: @guest.email, subject: "Бронирование подтверждено — #{@reservation.unit.name}")
  end

  def check_in_reminder(reservation)
    @reservation = reservation
    @guest = reservation.guest
    return unless @guest&.email.present?

    mail(to: @guest.email, subject: "Напоминание о заезде — #{@reservation.check_in}")
  end

  def check_out_thank_you(reservation)
    @reservation = reservation
    @guest = reservation.guest
    return unless @guest&.email.present?

    mail(to: @guest.email, subject: "Спасибо за визит!")
  end
end
