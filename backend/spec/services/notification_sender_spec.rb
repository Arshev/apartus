require "rails_helper"

RSpec.describe NotificationSender do
  let(:organization) { create(:organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }
  let(:guest) { create(:guest, organization: organization, email: "guest@example.com") }
  let(:reservation) { create(:reservation, unit: unit, guest: guest) }

  describe ".send_booking_confirmation" do
    it "enqueues mailer and creates notification log" do
      expect {
        described_class.send_booking_confirmation(reservation)
      }.to change(NotificationLog, :count).by(1)
       .and have_enqueued_mail(GuestMailer, :booking_confirmation)

      log = reservation.notification_logs.last
      expect(log.event_type).to eq("booking_confirmation")
      expect(log.channel).to eq("email")
      expect(log.recipient_email).to eq("guest@example.com")
    end

    it "skips when guest has no email" do
      reservation.guest.update!(email: nil)
      expect {
        described_class.send_booking_confirmation(reservation)
      }.not_to change(NotificationLog, :count)
    end

    it "skips when no guest" do
      reservation.update_column(:guest_id, nil)
      reservation.reload
      expect {
        described_class.send_booking_confirmation(reservation)
      }.not_to change(NotificationLog, :count)
    end
  end

  describe ".send_check_in_reminder" do
    it "enqueues mailer and creates notification log" do
      expect {
        described_class.send_check_in_reminder(reservation)
      }.to change(NotificationLog, :count).by(1)
       .and have_enqueued_mail(GuestMailer, :check_in_reminder)

      expect(reservation.notification_logs.last.event_type).to eq("check_in_reminder")
    end
  end

  describe ".send_check_out_thank_you" do
    it "enqueues mailer and creates notification log" do
      expect {
        described_class.send_check_out_thank_you(reservation)
      }.to change(NotificationLog, :count).by(1)
       .and have_enqueued_mail(GuestMailer, :check_out_thank_you)

      expect(reservation.notification_logs.last.event_type).to eq("check_out_thank_you")
    end
  end

  describe "mail delivery error rescue" do
    it "logs error and still creates notification_log on SMTP error" do
      allow(GuestMailer).to receive(:booking_confirmation).and_raise(Net::SMTPFatalError.new("550 SMTP fail"))
      expect {
        described_class.send_booking_confirmation(reservation)
      }.to change(NotificationLog, :count).by(1)
      # Log should still be created (rescue branch)
      log = reservation.notification_logs.last
      expect(log.event_type).to eq("booking_confirmation")
    end

    it "logs error and creates notification_log on SocketError" do
      allow(GuestMailer).to receive(:check_in_reminder).and_raise(SocketError.new("connection refused"))
      expect {
        described_class.send_check_in_reminder(reservation)
      }.to change(NotificationLog, :count).by(1)
    end

    it "logs error on Errno::ECONNREFUSED" do
      allow(GuestMailer).to receive(:check_out_thank_you).and_raise(Errno::ECONNREFUSED)
      expect {
        described_class.send_check_out_thank_you(reservation)
      }.to change(NotificationLog, :count).by(1)
    end
  end
end
