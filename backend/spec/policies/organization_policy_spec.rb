require "rails_helper"

RSpec.describe OrganizationPolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let(:record) { organization }

  subject { described_class.new(user, record) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    it { expect(subject.show?).to be true }
    it { expect(subject.update?).to be true }
  end

  context "as member without role" do
    let(:membership) { create(:membership, user: user, organization: organization, role_enum: :member) }
    before { stub_membership(membership) }

    it { expect(subject.show?).to be true }
    it { expect(subject.update?).to be false }
  end

  context "without membership" do
    before { stub_no_membership }

    it { expect(subject.show?).to be_falsey }
    it { expect(subject.update?).to be_falsey }
  end
end
