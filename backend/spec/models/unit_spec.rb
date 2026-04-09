require "rails_helper"

RSpec.describe Unit, type: :model do
  describe "cascade delete via Property" do
    it "destroys units when parent property is destroyed" do
      property = create(:property)
      unit1 = create(:unit, property: property)
      unit2 = create(:unit, property: property)

      expect { property.destroy }.to change(Unit, :count).by(-2)
      expect(Unit.where(id: [ unit1.id, unit2.id ])).to be_empty
    end
  end

  describe "enum validate: true (F1 follow-up)" do
    it "does not raise ArgumentError on invalid unit_type" do
      unit = build(:unit, unit_type: "villa")
      expect { unit.valid? }.not_to raise_error
      expect(unit).not_to be_valid
      expect(unit.errors[:unit_type]).to be_present
    end

    it "does not raise ArgumentError on invalid status" do
      unit = build(:unit, status: "archived")
      expect { unit.valid? }.not_to raise_error
      expect(unit).not_to be_valid
      expect(unit.errors[:status]).to be_present
    end
  end
end
