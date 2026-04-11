require "rails_helper"

RSpec.describe RolePolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let(:record) { create(:role, organization: organization) }

  subject { described_class.new(user, record) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be true }
    it { expect(subject.update?).to be true }
    it { expect(subject.destroy?).to be true }
  end

  context "as member with roles.manage" do
    let(:role) { create(:role, organization: organization, permissions: %w[roles.manage]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be true }
    it { expect(subject.update?).to be true }
    it { expect(subject.destroy?).to be true }
  end

  context "as member without permissions" do
    let(:membership) { create(:membership, user: user, organization: organization, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.index?).to be true }
    it { expect(subject.create?).to be false }
    it { expect(subject.update?).to be false }
    it { expect(subject.destroy?).to be false }
  end

  context "without membership" do
    before { stub_no_membership }

    it { expect(subject.index?).to be_falsey }
    it { expect(subject.create?).to be_falsey }
  end
end
