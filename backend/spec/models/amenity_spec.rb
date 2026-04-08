require "rails_helper"

RSpec.describe Amenity, type: :model do
  describe "uniqueness (case-insensitive per org)" do
    it "rejects duplicate with different case in same org" do
      org = create(:organization)
      create(:amenity, organization: org, name: "Wi-Fi")
      dup = build(:amenity, organization: org, name: "wi-fi")
      expect(dup).not_to be_valid
      expect(dup.errors[:name]).to be_present
    end

    it "allows same name in different orgs" do
      org_a = create(:organization)
      org_b = create(:organization)
      create(:amenity, organization: org_a, name: "Wi-Fi")
      same = build(:amenity, organization: org_b, name: "Wi-Fi")
      expect(same).to be_valid
    end
  end

  describe "normalization" do
    it "strips leading/trailing whitespace in name" do
      amenity = create(:amenity, name: "  Pool  ")
      expect(amenity.name).to eq("Pool")
    end
  end

  describe "before_destroy :prevent_destroy_if_in_use (R1)" do
    let(:org) { create(:organization) }
    let(:property) { create(:property, organization: org) }
    let(:unit) { create(:unit, property: property) }
    let(:amenity) { create(:amenity, organization: org) }

    it "allows destroy when no unit_amenities" do
      expect(amenity.destroy).to be_truthy
      expect { amenity.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "returns false on destroy when unit_amenities exist" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      expect(amenity.destroy).to be false
      expect { amenity.reload }.not_to raise_error
    end

    it "populates errors[:base] with exact Spec message" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      amenity.destroy
      expect(amenity.errors[:base]).to include("Amenity is in use and cannot be deleted")
    end
  end
end
