require "rails_helper"

RSpec.describe Branch, type: :model do
  let(:organization) { create(:organization) }

  describe "uniqueness per (org, parent, case-insensitive name)" do
    it "rejects duplicate case-insensitive name under same parent" do
      parent = create(:branch, organization: organization, name: "HQ")
      create(:branch, organization: organization, parent_branch: parent, name: "Центр")
      dup = build(:branch, organization: organization, parent_branch: parent, name: "центр")
      expect(dup).not_to be_valid
      expect(dup.errors[:name]).to be_present
    end

    it "allows same name under different parents" do
      p1 = create(:branch, organization: organization, name: "P1")
      p2 = create(:branch, organization: organization, name: "P2")
      create(:branch, organization: organization, parent_branch: p1, name: "Центр")
      sibling = build(:branch, organization: organization, parent_branch: p2, name: "Центр")
      expect(sibling).to be_valid
    end

    it "rejects two roots with same name in same org" do
      create(:branch, organization: organization, name: "HQ")
      dup = build(:branch, organization: organization, name: "hq")
      expect(dup).not_to be_valid
    end

    it "allows same root name in different orgs" do
      other_org = create(:organization)
      create(:branch, organization: organization, name: "HQ")
      same = build(:branch, organization: other_org, name: "HQ")
      expect(same).to be_valid
    end
  end

  describe "normalization" do
    it "strips leading/trailing whitespace in name" do
      b = create(:branch, organization: organization, name: "  HQ  ")
      expect(b.name).to eq("HQ")
    end
  end

  describe "parent_branch_must_exist_in_org validation" do
    it "is valid when parent_branch_id is nil (root)" do
      b = build(:branch, organization: organization, name: "Root")
      expect(b).to be_valid
    end

    it "is valid when parent_branch belongs to same org" do
      parent = create(:branch, organization: organization)
      child = build(:branch, organization: organization, parent_branch: parent, name: "Child")
      expect(child).to be_valid
    end

    it "is invalid when parent_branch_id set but record not found" do
      b = build(:branch, organization: organization, name: "Orphan")
      b.parent_branch_id = 999_999
      expect(b).not_to be_valid
      expect(b.errors[:parent_branch]).to include("must exist")
    end
  end

  describe "parent_is_not_self validation" do
    it "rejects parent_branch_id == id on update" do
      b = create(:branch, organization: organization)
      b.parent_branch_id = b.id
      expect(b).not_to be_valid
      expect(b.errors[:parent_branch]).to include("cannot be self")
    end
  end

  describe "parent_is_not_descendant validation (cycle)" do
    let!(:a) { create(:branch, organization: organization, name: "A") }
    let!(:b) { create(:branch, organization: organization, parent_branch: a, name: "B") }
    let!(:c) { create(:branch, organization: organization, parent_branch: b, name: "C") }

    it "rejects setting parent to a direct child" do
      a.parent_branch = b
      expect(a).not_to be_valid
      expect(a.errors[:parent_branch]).to include("cannot be a descendant")
    end

    it "rejects setting parent to a deep descendant" do
      a.parent_branch = c
      expect(a).not_to be_valid
      expect(a.errors[:parent_branch]).to include("cannot be a descendant")
    end

    it "allows setting parent to unrelated branch" do
      d = create(:branch, organization: organization, name: "D")
      c.parent_branch = d
      expect(c).to be_valid
    end

    it "allows moving to root (parent_branch_id: nil)" do
      c.parent_branch = nil
      expect(c).to be_valid
    end
  end

  describe "before_destroy :prevent_destroy_if_has_children" do
    it "allows destroy of leaf branch" do
      leaf = create(:branch, organization: organization)
      expect(leaf.destroy).to be_truthy
    end

    it "returns false on destroy when children exist" do
      parent = create(:branch, organization: organization)
      create(:branch, organization: organization, parent_branch: parent)
      expect(parent.destroy).to be false
      expect { parent.reload }.not_to raise_error
    end

    it "populates errors[:base] with exact Spec §5.5 message" do
      parent = create(:branch, organization: organization)
      create(:branch, organization: organization, parent_branch: parent)
      parent.destroy
      expect(parent.errors[:base]).to include("Branch has children and cannot be deleted")
    end
  end
end
