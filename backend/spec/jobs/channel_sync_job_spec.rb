require "rails_helper"

RSpec.describe ChannelSyncJob do
  let(:organization) { create(:organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }

  let(:ical_data) do
    <<~ICS
      BEGIN:VCALENDAR
      VERSION:2.0
      BEGIN:VEVENT
      UID:test-123@example.com
      DTSTART:#{(Date.current + 10).strftime('%Y%m%d')}
      DTEND:#{(Date.current + 13).strftime('%Y%m%d')}
      SUMMARY:Guest Stay
      END:VEVENT
      END:VCALENDAR
    ICS
  end

  describe "#perform" do
    it "skips when channel not found" do
      expect { described_class.new.perform(999999) }.not_to raise_error
    end

    it "skips when no import URL" do
      channel = create(:channel, unit: unit, ical_import_url: nil)
      expect { described_class.new.perform(channel.id) }.not_to change(Reservation, :count)
    end

    it "imports reservations from iCal feed" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: ical_data)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      expect {
        described_class.new.perform(channel.id)
      }.to change(Reservation, :count).by(1)

      reservation = unit.reservations.last
      expect(reservation.notes).to eq("ical:test-123@example.com")
      expect(reservation.status).to eq("confirmed")
    end

    it "does not duplicate existing reservations" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: ical_data)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      described_class.new.perform(channel.id)
      expect {
        described_class.new.perform(channel.id)
      }.not_to change(Reservation, :count)
    end

    it "updates last_synced_at" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: ical_data)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      described_class.new.perform(channel.id)
      expect(channel.reload.last_synced_at).to be_present
    end

    it "handles HTTP errors gracefully" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPNotFound, is_a?: false)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      expect { described_class.new.perform(channel.id) }.not_to raise_error
    end
  end
end
