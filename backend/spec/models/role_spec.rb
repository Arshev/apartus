require "rails_helper"

RSpec.describe Role do
  describe "validations" do
    subject { build(:role) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_presence_of(:code) }
    it { is_expected.to validate_uniqueness_of(:code).scoped_to(:organization_id) }
  end

  describe "associations" do
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to have_many(:memberships).dependent(:nullify) }
  end

  describe "#has_permission?" do
    let(:role) { create(:role, permissions: %w[properties.view units.view]) }

    it "returns true for included permission" do
      expect(role.has_permission?("properties.view")).to be true
    end

    it "returns false for missing permission" do
      expect(role.has_permission?("properties.manage")).to be false
    end
  end

  describe "#set_permissions" do
    let(:role) { create(:role, permissions: []) }

    it "sets valid permissions" do
      role.set_permissions(%w[properties.view units.view])
      expect(role.reload.permissions).to contain_exactly("properties.view", "units.view")
    end

    it "filters out invalid permissions" do
      role.set_permissions(%w[properties.view invalid.perm])
      expect(role.reload.permissions).to eq(%w[properties.view])
    end

    it "deduplicates permissions" do
      role.set_permissions(%w[properties.view properties.view])
      expect(role.reload.permissions).to eq(%w[properties.view])
    end
  end
end
