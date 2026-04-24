require "rails_helper"

RSpec.describe Owner do
  describe "validations" do
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_length_of(:name).is_at_most(255) }
    it { is_expected.to validate_numericality_of(:commission_rate).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(10000).only_integer }
  end

  describe "associations" do
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to have_many(:properties) }
  end

  describe "preferred_currency (FT-038)" do
    let(:organization) { create(:organization) }

    it "allows nil" do
      owner = Owner.new(organization: organization, name: "Test", commission_rate: 1500, preferred_currency: nil)
      expect(owner).to be_valid
    end

    it "accepts any CurrencyConfig code" do
      CurrencyConfig.codes.each do |code|
        owner = Owner.new(organization: organization, name: "Test", commission_rate: 1500, preferred_currency: code)
        expect(owner).to be_valid, "expected #{code} to be valid"
      end
    end

    it "rejects unknown codes (NEG-03)" do
      owner = Owner.new(organization: organization, name: "Test", commission_rate: 1500, preferred_currency: "XYZ")
      expect(owner).not_to be_valid
      expect(owner.errors[:preferred_currency]).to be_present
    end
  end
end
