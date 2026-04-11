require "rails_helper"

RSpec.describe DashboardPolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }

  subject { described_class.new(user, :dashboard) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    it { expect(subject.show?).to be true }
  end

  context "as member with finances.view" do
    let(:role) { create(:role, organization: organization, permissions: %w[finances.view]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.show?).to be true }
  end

  context "as member without permissions" do
    let(:membership) { create(:membership, user: user, organization: organization, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.show?).to be false }
  end

  context "without membership" do
    before { stub_no_membership }

    it { expect(subject.show?).to be_falsey }
  end
end
