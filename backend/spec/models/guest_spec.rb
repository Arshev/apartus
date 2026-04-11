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

  describe "normalizations" do
    it "strips last_name" do
      guest = build(:guest, last_name: "  Smith  ")
      guest.validate
      expect(guest.last_name).to eq("Smith")
    end

    it "strips phone" do
      guest = build(:guest, phone: "  +7 900 123  ")
      guest.validate
      expect(guest.phone).to eq("+7 900 123")
    end

    it "handles nil email without error" do
      guest = build(:guest, email: nil)
      expect(guest).to be_valid
    end
  end

  describe "email uniqueness with blanks" do
    let(:org) { create(:organization) }

    it "allows multiple guests with blank email in same org" do
      create(:guest, organization: org, email: nil)
      second = build(:guest, organization: org, email: "")
      expect(second).to be_valid
    end

    it "allows same email in different organizations" do
      other_org = create(:organization)
      create(:guest, organization: org, email: "same@test.com")
      other = build(:guest, organization: other_org, email: "same@test.com")
      expect(other).to be_valid
    end
  end

  describe "#full_name" do
    it "combines first and last name" do
      guest = build(:guest, first_name: "John", last_name: "Doe")
      expect(guest.full_name).to eq("John Doe")
    end
  end
end
