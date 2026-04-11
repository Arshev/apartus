require "rails_helper"

RSpec.describe SeasonalPrice do
  describe "validations" do
    it { is_expected.to validate_presence_of(:start_date) }
    it { is_expected.to validate_presence_of(:end_date) }
    it { is_expected.to validate_numericality_of(:price_cents).is_greater_than_or_equal_to(0).only_integer }

    it "requires end_date after start_date" do
      sp = build(:seasonal_price, start_date: Date.current, end_date: Date.current)
      expect(sp).not_to be_valid
      expect(sp.errors[:end_date]).to be_present
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:unit) }
  end
end
