require "rails_helper"

RSpec.describe PriceCalculator do
  let(:organization) { create(:organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property, base_price_cents: 10_000) }

  describe ".call" do
    it "returns 0 for blank dates" do
      expect(described_class.call(unit, nil, Date.current + 3)).to eq(0)
    end

    it "returns 0 when check_out <= check_in" do
      expect(described_class.call(unit, Date.current, Date.current)).to eq(0)
    end

    it "calculates base price for N nights" do
      result = described_class.call(unit, Date.current, Date.current + 3)
      expect(result).to eq(30_000)
    end

    it "uses seasonal price when available" do
      create(:seasonal_price, unit: unit, start_date: Date.current, end_date: Date.current + 10, price_cents: 15_000)
      result = described_class.call(unit, Date.current, Date.current + 2)
      expect(result).to eq(30_000)
    end

    it "mixes base and seasonal prices" do
      create(:seasonal_price, unit: unit, start_date: Date.current, end_date: Date.current + 1, price_cents: 20_000)
      result = described_class.call(unit, Date.current, Date.current + 2)
      expect(result).to eq(20_000 + 10_000)
    end

    context "with length_discount rule" do
      before do
        create(:pricing_rule, unit: unit, rule_type: :length_discount, min_nights: 3, discount_percent: 10, active: true)
      end

      it "applies discount when stay >= min_nights" do
        result = described_class.call(unit, Date.current, Date.current + 3)
        expect(result).to eq((30_000 * 0.9).round)
      end

      it "does not apply discount when stay < min_nights" do
        result = described_class.call(unit, Date.current, Date.current + 2)
        expect(result).to eq(20_000)
      end
    end

    context "with last_minute rule" do
      before do
        create(:pricing_rule, unit: unit, rule_type: :last_minute, min_nights: nil,
               days_before: 3, discount_percent: 15, active: true)
      end

      it "applies discount for near check-in" do
        result = described_class.call(unit, Date.current + 1, Date.current + 3)
        expect(result).to eq((20_000 * 0.85).round)
      end

      it "does not apply for far check-in" do
        result = described_class.call(unit, Date.current + 10, Date.current + 12)
        expect(result).to eq(20_000)
      end
    end

    context "with inactive rule" do
      before do
        create(:pricing_rule, unit: unit, rule_type: :length_discount, min_nights: 1, discount_percent: 50, active: false)
      end

      it "ignores inactive rules" do
        result = described_class.call(unit, Date.current, Date.current + 2)
        expect(result).to eq(20_000)
      end
    end

    it "never returns negative" do
      unit.update!(base_price_cents: 0)
      result = described_class.call(unit, Date.current, Date.current + 1)
      expect(result).to be >= 0
    end

    context "with occupancy_markup rule" do
      before do
        create(:pricing_rule, unit: unit, rule_type: :occupancy_markup,
               min_nights: nil, discount_percent: nil,
               occupancy_threshold: 50, markup_percent: 25, active: true)
      end

      it "applies markup when occupancy above threshold" do
        # Create enough occupied units to exceed 50% occupancy
        other_unit = create(:unit, property: property)
        create(:reservation, unit: other_unit,
               check_in: Date.current, check_out: Date.current + 5,
               status: :confirmed)
        # 1 out of 2 units occupied = 50%, meets threshold
        result = described_class.call(unit, Date.current, Date.current + 1)
        expect(result).to eq((10_000 * 1.25).round)
      end

      it "does not apply markup when occupancy below threshold" do
        # No reservations = 0% occupancy, threshold is 50%
        create(:unit, property: property) # add unit so 0 out of 2
        result = described_class.call(unit, Date.current + 90, Date.current + 91)
        expect(result).to eq(10_000)
      end
    end

    context "combined rules (length + last_minute)" do
      before do
        create(:pricing_rule, unit: unit, rule_type: :length_discount,
               min_nights: 3, discount_percent: 10, active: true)
        create(:pricing_rule, unit: unit, rule_type: :last_minute,
               min_nights: nil, days_before: 5, discount_percent: 20, active: true)
      end

      it "stacks both discounts sequentially" do
        # 3 nights, check-in tomorrow (within 5 days = last_minute)
        result = described_class.call(unit, Date.current + 1, Date.current + 4)
        # Base: 30_000
        # After length: 30_000 * 0.9 = 27_000
        # After last_minute: 27_000 * 0.8 = 21_600
        expect(result).to eq(21_600)
      end
    end

    context "edge cases" do
      it "returns 0 for unit with zero base_price and no seasonal prices" do
        unit.update!(base_price_cents: 0)
        result = described_class.call(unit, Date.current, Date.current + 3)
        expect(result).to eq(0)
      end

      it "handles single-night stay" do
        result = described_class.call(unit, Date.current, Date.current + 1)
        expect(result).to eq(10_000)
      end

      it "handles very long stay (30 nights)" do
        result = described_class.call(unit, Date.current + 100, Date.current + 130)
        expect(result).to eq(300_000)
      end
    end
  end
end
