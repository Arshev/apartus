require "rails_helper"

RSpec.describe Expense do
  describe "validations" do
    it { is_expected.to validate_presence_of(:amount_cents) }
    it { is_expected.to validate_numericality_of(:amount_cents).is_greater_than(0).only_integer }
    it { is_expected.to validate_presence_of(:expense_date) }
  end

  describe "associations" do
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to belong_to(:property).optional }
  end

  describe "category enum" do
    it { expect(described_class.categories).to include("maintenance" => 0, "utilities" => 1, "cleaning" => 2, "supplies" => 3, "other" => 4) }
  end
end
