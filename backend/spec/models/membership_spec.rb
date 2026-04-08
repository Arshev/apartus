require "rails_helper"

RSpec.describe Membership do
  describe "associations" do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to belong_to(:role).optional }
  end

  describe "validations" do
    subject { create(:membership) }

    it { is_expected.to validate_uniqueness_of(:user_id).scoped_to(:organization_id) }
  end

  describe "enum" do
    it { is_expected.to define_enum_for(:role_enum).with_values(member: 0, manager: 1, owner: 2) }
  end

  describe "#can?" do
    let(:organization) { create(:organization) }
    let(:user) { create(:user) }

    it "returns true for owner regardless of permission" do
      membership = create(:membership, :owner, user: user, organization: organization)
      expect(membership.can?("anything")).to be true
    end

    it "checks role permissions for non-owner" do
      role = create(:role, organization: organization, permissions: %w[properties.view])
      membership = create(:membership, user: user, organization: organization, role: role)

      expect(membership.can?("properties.view")).to be true
      expect(membership.can?("properties.manage")).to be false
    end

    it "returns false for member without role" do
      membership = create(:membership, user: user, organization: organization)
      expect(membership.can?("properties.view")).to be false
    end
  end

  describe "#permissions" do
    let(:organization) { create(:organization) }
    let(:user) { create(:user) }

    it "returns all permissions for owner" do
      membership = create(:membership, :owner, user: user, organization: organization)
      expect(membership.permissions).to eq(Permissions::ALL_PERMISSIONS)
    end

    it "returns role permissions for member with role" do
      role = create(:role, organization: organization, permissions: %w[properties.view])
      membership = create(:membership, user: user, organization: organization, role: role)
      expect(membership.permissions).to eq(%w[properties.view])
    end
  end
end
