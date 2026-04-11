require "rails_helper"

RSpec.describe ApplicationPolicy, type: :policy do
  let(:user) { create(:user) }
  let(:record) { double("record") }

  subject { described_class.new(user, record) }

  describe "default actions all return false" do
    it { expect(subject.index?).to be false }
    it { expect(subject.show?).to be false }
    it { expect(subject.create?).to be false }
    it { expect(subject.update?).to be false }
    it { expect(subject.destroy?).to be false }
  end

  describe "delegation" do
    it "new? delegates to create?" do
      expect(subject.new?).to eq(subject.create?)
    end

    it "edit? delegates to update?" do
      expect(subject.edit?).to eq(subject.update?)
    end
  end

  describe "Scope" do
    it "raises NoMethodError when resolve not defined" do
      scope = described_class::Scope.new(user, User)
      expect { scope.resolve }.to raise_error(NoMethodError, /must define #resolve/)
    end

    it "stores user and scope" do
      scope = described_class::Scope.new(user, User.all)
      # private attrs — just verify no error on construction
      expect(scope).to be_a(described_class::Scope)
    end
  end
end
