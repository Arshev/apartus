require "rails_helper"

RSpec.describe Channel do
  describe "validations" do
    subject { create(:channel) }

    it { is_expected.to validate_uniqueness_of(:ical_export_token) }
    it { is_expected.to validate_presence_of(:platform) }
  end

  describe "associations" do
    it { is_expected.to belong_to(:unit) }
  end

  describe "token generation" do
    it "auto-generates ical_export_token on create" do
      channel = create(:channel)
      expect(channel.ical_export_token).to be_present
    end

    it "does not overwrite existing token" do
      channel = create(:channel, ical_export_token: "my-custom-token")
      expect(channel.ical_export_token).to eq("my-custom-token")
    end
  end

  describe "#ical_export_path" do
    it "returns the public ical path" do
      channel = build(:channel, ical_export_token: "test-token-123")
      expect(channel.ical_export_path).to eq("/api/v1/public/ical/test-token-123.ics")
    end
  end

  describe "platform enum" do
    it { expect(described_class.platforms).to include("booking_com" => 0, "airbnb" => 1, "ostrovok" => 2, "other" => 3) }
  end
end
