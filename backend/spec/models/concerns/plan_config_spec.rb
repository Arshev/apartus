require "rails_helper"

RSpec.describe PlanConfig do
  describe ".codes" do
    it "returns all plan codes" do
      expect(described_class.codes).to contain_exactly("starter", "professional", "business", "enterprise")
    end
  end

  describe ".config_for" do
    it "returns config for known plan" do
      config = described_class.config_for("professional")
      expect(config[:name]).to eq("Professional")
      expect(config[:max_units]).to eq(50)
      expect(config[:max_users]).to eq(3)
    end

    it "falls back to starter for unknown plan" do
      config = described_class.config_for("nonexistent")
      expect(config[:name]).to eq("Starter")
    end

    it "falls back to starter for nil" do
      config = described_class.config_for(nil)
      expect(config[:name]).to eq("Starter")
    end

    it "enterprise has unlimited units and users" do
      config = described_class.config_for("enterprise")
      expect(config[:max_units]).to eq(-1)
      expect(config[:max_users]).to eq(-1)
    end

    it "starter has minimal limits" do
      config = described_class.config_for("starter")
      expect(config[:max_units]).to eq(3)
      expect(config[:max_users]).to eq(1)
      expect(config[:channel_manager]).to be false
      expect(config[:booking_widget]).to be false
      expect(config[:pdf_export]).to be false
    end

    it "business has automation enabled" do
      config = described_class.config_for("business")
      expect(config[:automation]).to be true
      expect(config[:pdf_export]).to be true
    end
  end

  describe ".within_limit?" do
    it "returns true when current_count < max" do
      expect(described_class.within_limit?(2, 3)).to be true
    end

    it "returns false when current_count >= max" do
      expect(described_class.within_limit?(3, 3)).to be false
    end

    it "returns false when current_count > max" do
      expect(described_class.within_limit?(5, 3)).to be false
    end

    it "returns true when max is -1 (unlimited)" do
      expect(described_class.within_limit?(999, -1)).to be true
    end

    it "returns true for zero current with positive max" do
      expect(described_class.within_limit?(0, 1)).to be true
    end

    it "returns true for zero current with unlimited" do
      expect(described_class.within_limit?(0, -1)).to be true
    end

    it "boundary: returns true at max-1" do
      expect(described_class.within_limit?(2, 3)).to be true
    end

    it "boundary: returns false at exactly max" do
      expect(described_class.within_limit?(3, 3)).to be false
    end
  end
end
