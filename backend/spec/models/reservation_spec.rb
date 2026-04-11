require "rails_helper"

RSpec.describe Reservation do
  describe "validations" do
    it { is_expected.to validate_presence_of(:check_in) }
    it { is_expected.to validate_presence_of(:check_out) }
    it { is_expected.to validate_presence_of(:guests_count) }
    it { is_expected.to validate_numericality_of(:guests_count).is_greater_than_or_equal_to(1).only_integer }
    it { is_expected.to validate_numericality_of(:total_price_cents).is_greater_than_or_equal_to(0).only_integer }

    it "requires check_out after check_in" do
      reservation = build(:reservation, check_in: Date.current, check_out: Date.current)
      expect(reservation).not_to be_valid
      expect(reservation.errors[:check_out]).to be_present
    end
  end

  describe "associations" do
    it { is_expected.to belong_to(:unit) }
    it { is_expected.to belong_to(:guest).optional }
    it { is_expected.to have_many(:notification_logs).dependent(:destroy) }
  end

  describe "status enum" do
    it { expect(described_class.statuses).to include("confirmed" => 0, "checked_in" => 1, "checked_out" => 2, "cancelled" => 3) }
  end

  describe "#can_check_in?" do
    it "returns true when confirmed" do
      expect(build(:reservation, status: :confirmed).can_check_in?).to be true
    end

    it "returns false when checked_in" do
      expect(build(:reservation, status: :checked_in).can_check_in?).to be false
    end
  end

  describe "#can_check_out?" do
    it "returns true when checked_in" do
      expect(build(:reservation, status: :checked_in).can_check_out?).to be true
    end

    it "returns false when confirmed" do
      expect(build(:reservation, status: :confirmed).can_check_out?).to be false
    end
  end

  describe "#can_cancel?" do
    it "returns true when confirmed" do
      expect(build(:reservation, status: :confirmed).can_cancel?).to be true
    end

    it "returns true when checked_in" do
      expect(build(:reservation, status: :checked_in).can_cancel?).to be true
    end

    it "returns false when checked_out" do
      expect(build(:reservation, status: :checked_out).can_cancel?).to be false
    end

    it "returns false when cancelled" do
      expect(build(:reservation, status: :cancelled).can_cancel?).to be false
    end
  end

  describe "overlapping reservation validation" do
    let(:unit) { create(:unit) }

    it "prevents overlapping active reservations on the same unit" do
      create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 5, status: :confirmed)
      overlapping = build(:reservation, unit: unit, check_in: Date.current + 2, check_out: Date.current + 7, status: :confirmed)
      expect(overlapping).not_to be_valid
      expect(overlapping.errors[:base]).to be_present
    end

    it "allows non-overlapping reservations" do
      create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 3, status: :confirmed)
      non_overlapping = build(:reservation, unit: unit, check_in: Date.current + 3, check_out: Date.current + 6, status: :confirmed)
      expect(non_overlapping).to be_valid
    end

    it "allows overlapping if existing is cancelled" do
      create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 5, status: :cancelled)
      overlapping = build(:reservation, unit: unit, check_in: Date.current + 2, check_out: Date.current + 7, status: :confirmed)
      expect(overlapping).to be_valid
    end
  end
end
