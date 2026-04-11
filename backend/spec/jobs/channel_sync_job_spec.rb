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

    it "handles network exceptions gracefully" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      allow(Net::HTTP).to receive(:get_response).and_raise(SocketError.new("getaddrinfo failed"))

      expect { described_class.new.perform(channel.id) }.not_to raise_error
    end

    it "imports multiple events from single feed" do
      multi_event = <<~ICS
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:multi-1@example.com
        DTSTART:#{(Date.current + 20).strftime('%Y%m%d')}
        DTEND:#{(Date.current + 22).strftime('%Y%m%d')}
        SUMMARY:First
        END:VEVENT
        BEGIN:VEVENT
        UID:multi-2@example.com
        DTSTART:#{(Date.current + 25).strftime('%Y%m%d')}
        DTEND:#{(Date.current + 28).strftime('%Y%m%d')}
        SUMMARY:Second
        END:VEVENT
        END:VCALENDAR
      ICS
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: multi_event)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      expect {
        described_class.new.perform(channel.id)
      }.to change(Reservation, :count).by(2)
    end

    it "skips events missing DTSTART" do
      no_start = <<~ICS
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:nostart@example.com
        DTEND:#{(Date.current + 5).strftime('%Y%m%d')}
        END:VEVENT
        END:VCALENDAR
      ICS
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: no_start)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      expect {
        described_class.new.perform(channel.id)
      }.not_to change(Reservation, :count)
    end

    it "skips events missing DTEND" do
      no_end = <<~ICS
        BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        UID:noend@example.com
        DTSTART:#{(Date.current + 5).strftime('%Y%m%d')}
        END:VEVENT
        END:VCALENDAR
      ICS
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: no_end)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      expect {
        described_class.new.perform(channel.id)
      }.not_to change(Reservation, :count)
    end

    it "handles empty iCal response (no events)" do
      empty_cal = "BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR"
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: empty_cal)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      expect {
        described_class.new.perform(channel.id)
      }.not_to change(Reservation, :count)
      expect(channel.reload.last_synced_at).to be_present
    end

    it "creates reservations with guests_count=1 and status=confirmed" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      response = instance_double(Net::HTTPSuccess, is_a?: true, body: ical_data)
      allow(Net::HTTP).to receive(:get_response).and_return(response)

      described_class.new.perform(channel.id)
      reservation = unit.reservations.last
      expect(reservation.guests_count).to eq(1)
      expect(reservation.status).to eq("confirmed")
      expect(reservation.total_price_cents).to eq(0)
      expect(reservation.guest_id).to be_nil
    end
  end
end
