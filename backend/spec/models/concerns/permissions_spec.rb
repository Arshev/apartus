require "rails_helper"

RSpec.describe Permissions do
  describe "ALL_PERMISSIONS" do
    it "is frozen" do
      expect(described_class::ALL_PERMISSIONS).to be_frozen
    end

    it "includes expected permission groups" do
      perms = described_class::ALL_PERMISSIONS
      expect(perms).to include("organizations.manage", "organizations.view")
      expect(perms).to include("members.manage", "members.view")
      expect(perms).to include("properties.manage", "properties.view")
      expect(perms).to include("units.manage", "units.view")
      expect(perms).to include("reservations.manage", "reservations.view")
    end
  end

  describe "PRESET_ROLES" do
    it "defines admin, manager, viewer" do
      expect(described_class::PRESET_ROLES.keys).to contain_exactly(:admin, :manager, :viewer)
    end

    it "admin has all permissions" do
      expect(described_class::PRESET_ROLES[:admin][:permissions]).to eq(described_class::ALL_PERMISSIONS)
    end

    it "viewer has no manage permissions" do
      viewer_perms = described_class::PRESET_ROLES[:viewer][:permissions]
      manage_perms = viewer_perms.select { |p| p.include?("manage") }
      expect(manage_perms).to be_empty
    end

    it "manager has more permissions than viewer" do
      manager_perms = described_class::PRESET_ROLES[:manager][:permissions]
      viewer_perms = described_class::PRESET_ROLES[:viewer][:permissions]
      expect(manager_perms.length).to be > viewer_perms.length
    end
  end

  describe ".valid?" do
    it "returns true for known permission" do
      expect(described_class.valid?("properties.view")).to be true
    end

    it "returns false for unknown permission" do
      expect(described_class.valid?("nonexistent.perm")).to be false
    end
  end
end
