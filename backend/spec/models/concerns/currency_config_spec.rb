require "rails_helper"

RSpec.describe CurrencyConfig do
  describe ".codes" do
    it "returns all currency codes" do
      expect(described_class.codes).to include("RUB", "USD", "EUR", "THB", "UZS", "IDR")
    end

    it "has at least 10 currencies" do
      expect(described_class.codes.length).to be >= 10
    end
  end

  describe ".config_for" do
    it "returns config for known currency" do
      config = described_class.config_for("RUB")
      expect(config[:symbol]).to eq("₽")
      expect(config[:decimal_places]).to eq(2)
      expect(config[:symbol_position]).to eq(:after)
    end

    it "returns USD config for unknown currency" do
      config = described_class.config_for("UNKNOWN")
      expect(config[:symbol]).to eq("$")
    end

    it "returns USD config for nil" do
      config = described_class.config_for(nil)
      expect(config[:symbol]).to eq("$")
    end

    it "UZS has 0 decimal places" do
      config = described_class.config_for("UZS")
      expect(config[:decimal_places]).to eq(0)
    end

    it "IDR has 0 decimal places" do
      config = described_class.config_for("IDR")
      expect(config[:decimal_places]).to eq(0)
    end

    it "all currencies have required keys" do
      described_class.codes.each do |code|
        config = described_class.config_for(code)
        expect(config).to have_key(:symbol)
        expect(config).to have_key(:decimal_places)
        expect(config).to have_key(:symbol_position)
        expect(config).to have_key(:name)
      end
    end
  end
end
