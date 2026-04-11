require "rails_helper"

RSpec.describe MembershipPolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:other_membership) { create(:membership, user: other_user, organization: organization) }

  subject { described_class.new(user, other_membership) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be true }
    it { expect(subject.update?).to be true }
    it { expect(subject.destroy?).to be true }
  end

  context "as member with members.view" do
    let(:role) { create(:role, organization: organization, permissions: %w[members.view]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be false }
    it { expect(subject.update?).to be false }
    it { expect(subject.destroy?).to be false }
  end

  context "as member with members.manage" do
    let(:role) { create(:role, organization: organization, permissions: %w[members.manage]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be false }
    it { expect(subject.create?).to be true }
    it { expect(subject.update?).to be true }
    it { expect(subject.destroy?).to be true }
  end

  context "cannot destroy own membership" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    subject { described_class.new(user, membership) }

    it { expect(subject.destroy?).to be false }
  end

  context "without membership" do
    before { stub_no_membership }

    it { expect(subject.index?).to be_falsey }
    it { expect(subject.create?).to be_falsey }
  end
end
