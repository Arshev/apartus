require "rails_helper"

RSpec.describe UnitAmenity, type: :model do
  let(:org) { create(:organization) }
  let(:property) { create(:property, organization: org) }
  let(:unit) { create(:unit, property: property) }
  let(:amenity) { create(:amenity, organization: org) }

  describe "cascade delete from Unit" do
    it "destroys unit_amenities when parent unit is destroyed" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      other_amenity = create(:amenity, organization: org)
      UnitAmenity.create!(unit: unit, amenity: other_amenity)

      expect { unit.destroy }.to change(UnitAmenity, :count).by(-2)
    end
  end

  describe "uniqueness (unit_id, amenity_id)" do
    it "rejects duplicate attachment" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      dup = UnitAmenity.new(unit: unit, amenity: amenity)
      expect(dup).not_to be_valid
      expect(dup.errors[:amenity_id]).to include("has already been attached")
    end
  end

  describe "presence validations" do
    it "is invalid without unit" do
      ua = UnitAmenity.new(amenity: amenity)
      expect(ua).not_to be_valid
      expect(ua.errors[:unit]).to be_present
    end

    it "is invalid without amenity" do
      ua = UnitAmenity.new(unit: unit)
      expect(ua).not_to be_valid
      expect(ua.errors[:amenity]).to be_present
    end
  end
end
