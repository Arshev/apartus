require "rails_helper"

RSpec.describe GuestMailer do
  let(:organization) { create(:organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property, name: "Room 101") }
  let(:guest) { create(:guest, organization: organization, email: "guest@example.com") }
  let(:reservation) { create(:reservation, unit: unit, guest: guest, check_in: Date.current + 1, check_out: Date.current + 3) }

  describe "#booking_confirmation" do
    it "sends to guest email with correct subject" do
      mail = described_class.booking_confirmation(reservation)
      expect(mail.to).to eq([ "guest@example.com" ])
      expect(mail.subject).to include("Бронирование подтверждено")
      expect(mail.subject).to include("Room 101")
    end

    it "returns nil when guest has no email" do
      reservation.guest.update!(email: nil)
      mail = described_class.booking_confirmation(reservation)
      expect(mail.to).to be_nil
    end
  end

  describe "#check_in_reminder" do
    it "sends to guest email" do
      mail = described_class.check_in_reminder(reservation)
      expect(mail.to).to eq([ "guest@example.com" ])
      expect(mail.subject).to include("Напоминание о заезде")
    end
  end

  describe "#check_out_thank_you" do
    it "sends to guest email" do
      mail = described_class.check_out_thank_you(reservation)
      expect(mail.to).to eq([ "guest@example.com" ])
      expect(mail.subject).to include("Спасибо за визит")
    end
  end
end
