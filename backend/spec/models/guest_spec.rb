require "rails_helper"

RSpec.describe Guest do
  describe "validations" do
    subject { build(:guest) }

    it { is_expected.to validate_presence_of(:first_name) }
    it { is_expected.to validate_presence_of(:last_name) }
    it { is_expected.to validate_length_of(:first_name).is_at_most(255) }
    it { is_expected.to validate_length_of(:last_name).is_at_most(255) }
    it { is_expected.to validate_length_of(:email).is_at_most(255) }
    it { is_expected.to validate_length_of(:phone).is_at_most(50) }
    it { is_expected.to validate_uniqueness_of(:email).scoped_to(:organization_id).case_insensitive }
  end

  describe "associations" do
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to have_many(:reservations).dependent(:nullify) }
  end

  describe "normalizations" do
    it "strips first_name" do
      guest = build(:guest, first_name: "  John  ")
      guest.validate
      expect(guest.first_name).to eq("John")
    end

    it "downcases and strips email" do
      guest = build(:guest, email: "  GUEST@Example.COM  ")
      guest.validate
      expect(guest.email).to eq("guest@example.com")
    end
  end

  describe "#full_name" do
    it "combines first and last name" do
      guest = build(:guest, first_name: "John", last_name: "Doe")
      expect(guest.full_name).to eq("John Doe")
    end
  end
end
