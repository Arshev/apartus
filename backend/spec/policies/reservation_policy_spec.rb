require "rails_helper"

RSpec.describe ReservationPolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let(:record) { build(:reservation) }

  subject { described_class.new(user, record) }

  context "as owner" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before { stub_membership(membership) }

    %i[index show create update destroy check_in check_out cancel].each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be true }
    end
  end

  context "as member with reservations.view" do
    let(:role) { create(:role, organization: organization, permissions: %w[reservations.view]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    %i[index show].each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be true }
    end

    %i[create update destroy check_in check_out cancel].each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be false }
    end
  end

  context "as member with reservations.manage" do
    let(:role) { create(:role, organization: organization, permissions: %w[reservations.manage]) }
    let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
    before { stub_membership(membership) }

    %i[create update destroy check_in check_out cancel].each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be true }
    end
  end

  context "without membership" do
    before { stub_no_membership }

    %i[index show create update destroy check_in check_out cancel].each do |action|
      it { expect(subject.public_send(:"#{action}?")).to be_falsey }
    end
  end
end
