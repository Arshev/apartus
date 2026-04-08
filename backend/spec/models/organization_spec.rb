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
end
