class NotificationSender
  def self.send_booking_confirmation(reservation)
    send_email(reservation, :booking_confirmation, "booking_confirmation")
  end

  def self.send_check_in_reminder(reservation)
    send_email(reservation, :check_in_reminder, "check_in_reminder")
  end

  def self.send_check_out_thank_you(reservation)
    send_email(reservation, :check_out_thank_you, "check_out_thank_you")
  end

  def self.send_email(reservation, mailer_method, event_type)
    return unless reservation.guest&.email.present?

    GuestMailer.send(mailer_method, reservation).deliver_later

    reservation.notification_logs.create!(
      event_type: event_type,
      channel: "email",
      recipient_email: reservation.guest.email,
      sent_at: Time.current
    )
  rescue StandardError => e
    Rails.logger.error("NotificationSender failed: #{e.message}")
  end
end
