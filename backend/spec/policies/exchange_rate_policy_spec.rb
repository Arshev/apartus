require "rails_helper"

RSpec.describe ExchangeRatePolicy, type: :policy do
  let(:organization) { create(:organization) }
  let(:other_org)    { create(:organization) }
  let(:user)         { create(:user) }

  def manual_rate(org)
    create(:exchange_rate, :manual, organization: org)
  end

  def api_rate
    create(:exchange_rate, source: "api", organization_id: nil,
           base_currency: "USD", quote_currency: "RUB",
           effective_date: Date.current)
  end

  describe "permission gating" do
    context "without currency_rates.manage permission" do
      let(:membership) { create(:membership, user: user, organization: organization, role_enum: :member) }
      before { stub_membership(membership) }

      it "denies all actions" do
        policy = described_class.new(user, manual_rate(organization))
        %i[index? show? create? update? destroy?].each do |action|
          expect(policy.public_send(action)).to be_falsey
        end
      end
    end

    context "with currency_rates.manage permission" do
      let(:role) { create(:role, organization: organization, permissions: [ "currency_rates.manage" ]) }
      let(:membership) { create(:membership, user: user, organization: organization, role: role, role_enum: :member) }
      before do
        stub_membership(membership)
        allow(Current).to receive(:organization).and_return(organization)
      end

      it "allows index / show / create" do
        policy = described_class.new(user, manual_rate(organization))
        expect(policy.index?).to be true
        expect(policy.show?).to be true
        expect(policy.create?).to be true
      end

      it "allows update/destroy on own-org manual row" do
        policy = described_class.new(user, manual_rate(organization))
        expect(policy.update?).to be true
        expect(policy.destroy?).to be true
      end

      it "denies update/destroy on API row (organization_id IS NULL) — EC-05, NEG-08" do
        policy = described_class.new(user, api_rate)
        expect(policy.update?).to be false
        expect(policy.destroy?).to be false
      end

      it "denies update/destroy on other org's manual row (defense-in-depth)" do
        policy = described_class.new(user, manual_rate(other_org))
        expect(policy.update?).to be false
      end
    end

    context "as owner (role_enum bypass)" do
      let(:membership) { create(:membership, :owner, user: user, organization: organization) }
      before do
        stub_membership(membership)
        allow(Current).to receive(:organization).and_return(organization)
      end

      it "allows all actions on own manual row" do
        policy = described_class.new(user, manual_rate(organization))
        %i[index? show? create? update? destroy?].each do |action|
          expect(policy.public_send(action)).to be true
        end
      end

      it "still denies mutation of global API row" do
        policy = described_class.new(user, api_rate)
        expect(policy.update?).to be false
      end
    end
  end

  describe "Scope.resolve (NEG-04 multi-tenant isolation)" do
    let(:membership) { create(:membership, :owner, user: user, organization: organization) }
    before do
      stub_membership(membership)
      allow(Current).to receive(:organization).and_return(organization)
    end

    it "returns global rows OR own-org rows, never other-org rows" do
      own    = manual_rate(organization)
      theirs = manual_rate(other_org)
      api    = api_rate

      resolved = described_class::Scope.new(user, ExchangeRate.all).resolve.to_a
      expect(resolved).to contain_exactly(own, api)
      expect(resolved).not_to include(theirs)
    end

    it "returns none when no current organization" do
      allow(Current).to receive(:organization).and_return(nil)
      _ = manual_rate(organization)
      expect(described_class::Scope.new(user, ExchangeRate.all).resolve.to_a).to be_empty
    end
  end
end
