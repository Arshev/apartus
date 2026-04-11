require "rails_helper"

RSpec.describe UnitAmenityPolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let(:record) { build(:unit_amenity) }

  subject { described_class.new(user, record) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be true }
    it { expect(subject.destroy?).to be true }
  end

  context "as member with both view permissions" do
    let(:role) { create(:role, organization: organization, permissions: %w[units.view amenities.view]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be false }
    it { expect(subject.destroy?).to be false }
  end

  context "as member with only units.view" do
    let(:role) { create(:role, organization: organization, permissions: %w[units.view]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be false }
  end

  context "as member with units.manage" do
    let(:role) { create(:role, organization: organization, permissions: %w[units.manage]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.create?).to be true }
    it { expect(subject.destroy?).to be true }
  end

  context "without membership" do
    before { stub_no_membership }

    it { expect(subject.index?).to be_falsey }
    it { expect(subject.create?).to be_falsey }
    it { expect(subject.destroy?).to be_falsey }
  end
end
