require "rails_helper"

RSpec.describe PricingRule do
  describe "validations" do
    it { is_expected.to validate_numericality_of(:discount_percent).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(100) }
    it { is_expected.to validate_numericality_of(:markup_percent).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(200) }

    context "length_discount" do
      subject { build(:pricing_rule, rule_type: :length_discount) }
      it { is_expected.to validate_numericality_of(:min_nights).is_greater_than(0) }
    end

    context "last_minute" do
      subject { build(:pricing_rule, rule_type: :last_minute, min_nights: nil, days_before: 3) }
      it { is_expected.to validate_numericality_of(:days_before).is_greater_than(0) }
    end

    context "occupancy_markup" do
      subject { build(:pricing_rule, rule_type: :occupancy_markup, min_nights: nil, discount_percent: nil, markup_percent: 20, occupancy_threshold: 80) }
      it { is_expected.to validate_numericality_of(:occupancy_threshold).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(100) }
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:unit) }
  end

  describe "rule_type enum" do
    it { expect(described_class.rule_types).to include("length_discount" => 0, "last_minute" => 1, "occupancy_markup" => 2) }
  end
end
