require "rails_helper"

RSpec.describe TelegramNotifier do
  let(:organization) do
    create(:organization, settings: {
      "telegram_bot_token" => "123:ABC",
      "telegram_chat_id" => "456"
    })
  end
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property, name: "Room 1") }
  let(:guest) { create(:guest, organization: organization) }
  let(:reservation) { create(:reservation, unit: unit, guest: guest, total_price_cents: 10_000) }

  before do
    allow(Net::HTTP).to receive(:post_form).and_return(
      instance_double(Net::HTTPSuccess, is_a?: true, code: "200", body: '{"ok":true}')
    )
  end

  describe ".configured?" do
    it "returns true when both settings present" do
      expect(described_class.configured?(organization)).to be true
    end

    it "returns false without token" do
      organization.update!(settings: { "telegram_chat_id" => "456" })
      expect(described_class.configured?(organization)).to be false
    end

    it "returns false without chat_id" do
      organization.update!(settings: { "telegram_bot_token" => "123:ABC" })
      expect(described_class.configured?(organization)).to be false
    end

    it "returns false with nil settings" do
      organization.update!(settings: nil)
      expect(described_class.configured?(organization)).to be false
    end
  end

  describe ".notify_booking" do
    it "sends message via Telegram API" do
      described_class.notify_booking(reservation)
      expect(Net::HTTP).to have_received(:post_form)
    end

    it "skips when not configured" do
      organization.update!(settings: {})
      described_class.notify_booking(reservation)
      expect(Net::HTTP).not_to have_received(:post_form)
    end
  end

  describe ".notify_status_change" do
    it "sends status change notification" do
      described_class.notify_status_change(reservation, "checked_in")
      expect(Net::HTTP).to have_received(:post_form)
    end
  end

  describe ".send_test" do
    it "returns true on success" do
      expect(described_class.send_test(organization)).to be true
    end

    it "returns false when not configured" do
      organization.update!(settings: {})
      expect(described_class.send_test(organization)).to be false
    end
  end

  describe "error handling" do
    it "logs error when API returns non-success" do
      allow(Net::HTTP).to receive(:post_form).and_return(
        instance_double(Net::HTTPBadRequest, is_a?: false, code: "400", body: '{"ok":false}')
      )
      expect(Rails.logger).to receive(:error).with(/TelegramNotifier failed/)
      described_class.notify_booking(reservation)
    end

    it "catches and logs StandardError on send" do
      allow(Net::HTTP).to receive(:post_form).and_raise(SocketError.new("network down"))
      expect(Rails.logger).to receive(:error).with(/TelegramNotifier error/)
      described_class.notify_booking(reservation)
    end
  end

  describe ".format_price (private)" do
    it "formats zero-decimal currency" do
      config = { decimal_places: 0, symbol: "Rp", symbol_position: :before }
      result = described_class.send(:format_price, 50000, config)
      expect(result).to eq("Rp500")
    end

    it "formats symbol-after currency" do
      config = { decimal_places: 2, symbol: "₽", symbol_position: :after }
      result = described_class.send(:format_price, 10000, config)
      expect(result).to eq("100.0 ₽")
    end
  end
end
