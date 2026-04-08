require "rails_helper"

RSpec.describe User do
  describe "validations" do
    subject { build(:user) }

    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_uniqueness_of(:email).case_insensitive }
    it { is_expected.to validate_presence_of(:first_name) }
    it { is_expected.to validate_presence_of(:last_name) }
  end

  describe "associations" do
    it { is_expected.to have_many(:memberships).dependent(:destroy) }
    it { is_expected.to have_many(:organizations).through(:memberships) }
  end

  describe "email normalization" do
    it "normalizes email to lowercase and strips whitespace" do
      user = create(:user, email: "  TEST@Example.COM  ")
      expect(user.email).to eq("test@example.com")
    end
  end

  describe "#full_name" do
    it "returns first and last name" do
      user = build(:user, first_name: "John", last_name: "Doe")
      expect(user.full_name).to eq("John Doe")
    end
  end

  describe "#membership_for" do
    it "returns membership for given organization" do
      user = create(:user)
      org = create(:organization)
      membership = create(:membership, user: user, organization: org)

      expect(user.membership_for(org)).to eq(membership)
    end

    it "returns nil if not a member" do
      user = create(:user)
      org = create(:organization)

      expect(user.membership_for(org)).to be_nil
    end
  end

  describe "password" do
    it "validates minimum length" do
      user = build(:user, password: "short", password_confirmation: "short")
      expect(user).not_to be_valid
      expect(user.errors[:password]).to include("is too short (minimum is 8 characters)")
    end

    it "authenticates with correct password" do
      user = create(:user, password: "password123")
      expect(user.authenticate("password123")).to eq(user)
    end

    it "rejects incorrect password" do
      user = create(:user, password: "password123")
      expect(user.authenticate("wrong")).to be_falsey
    end
  end
end
