require "rails_helper"

RSpec.describe Organization do
  describe "validations" do
    subject { build(:organization) }

    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_uniqueness_of(:slug) }
  end

  describe "associations" do
    it { is_expected.to have_many(:memberships).dependent(:destroy) }
    it { is_expected.to have_many(:users).through(:memberships) }
    it { is_expected.to have_many(:roles).dependent(:destroy) }
  end

  describe "slug generation" do
    it "auto-generates slug from name" do
      org = create(:organization, name: "Test Company", slug: nil)
      expect(org.slug).to eq("test-company")
    end

    it "handles duplicate slugs" do
      create(:organization, name: "Test", slug: "test")
      org2 = create(:organization, name: "Test", slug: nil)
      expect(org2.slug).to eq("test-1")
    end
  end

  describe "preset roles" do
    it "creates preset roles after creation" do
      org = create(:organization, slug: nil)
      expect(org.roles.count).to eq(3)
      expect(org.roles.pluck(:code)).to contain_exactly("admin", "manager", "viewer")
    end

    it "marks preset roles as system" do
      org = create(:organization, slug: nil)
      expect(org.roles.where(is_system: true).count).to eq(3)
    end
  end

  describe "slug generation edge cases" do
    it "preserves slug if already provided" do
      org = create(:organization, name: "Foo", slug: "custom-slug")
      expect(org.slug).to eq("custom-slug")
    end

    it "handles triple slug collision" do
      create(:organization, name: "AAA", slug: "aaa")
      create(:organization, name: "AAA", slug: "aaa-1")
      org3 = create(:organization, name: "AAA", slug: nil)
      expect(org3.slug).to eq("aaa-2")
    end
  end

  describe "#can_add_units?" do
    it "returns true when under limit" do
      org = create(:organization, plan: "starter")
      expect(org.can_add_units?).to be true
    end

    it "returns false when at limit" do
      org = create(:organization, plan: "starter") # max_units: 3
      property = create(:property, organization: org)
      3.times { create(:unit, property: property) }
      expect(org.can_add_units?).to be false
    end

    it "returns true for unlimited plan (enterprise)" do
      org = create(:organization, plan: "enterprise")
      expect(org.can_add_units?).to be true
    end
  end

  describe "#can_add_users?" do
    it "returns true when under limit" do
      org = create(:organization, plan: "professional") # max_users: 3
      create(:membership, organization: org)
      expect(org.can_add_users?).to be true
    end

    it "returns false when at limit" do
      org = create(:organization, plan: "starter") # max_users: 1
      create(:membership, organization: org)
      expect(org.can_add_users?).to be false
    end
  end

  describe "#has_feature?" do
    it "returns true for feature enabled in plan" do
      org = create(:organization, plan: "professional")
      expect(org.has_feature?(:pdf_export)).to be true
      expect(org.has_feature?(:booking_widget)).to be true
    end

    it "returns false for feature disabled in plan" do
      org = create(:organization, plan: "starter")
      expect(org.has_feature?(:pdf_export)).to be false
      expect(org.has_feature?(:booking_widget)).to be false
      expect(org.has_feature?(:automation)).to be false
    end

    it "returns false for non-existent feature key" do
      org = create(:organization, plan: "enterprise")
      expect(org.has_feature?(:nonexistent)).to be false
    end
  end
end
