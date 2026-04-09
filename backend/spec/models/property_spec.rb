require "rails_helper"

RSpec.describe Property, type: :model do
  describe "branch_must_exist_in_org validation (F5)" do
    let(:organization) { create(:organization) }

    it "AC12a — is invalid when branch_id is non-existing" do
      property = build(:property, organization: organization)
      property.branch_id = 999_999
      expect(property).not_to be_valid
      expect(property.errors[:branch]).to include("must exist")
    end

    it "AC12b — is invalid when branch_id belongs to another org (cross-org)" do
      other_org = create(:organization)
      foreign_branch = create(:branch, organization: other_org)
      property = build(:property, organization: organization)
      property.branch_id = foreign_branch.id
      expect(property).not_to be_valid
      expect(property.errors[:branch]).to include("must exist")
    end

    it "is valid when branch belongs to same org" do
      branch = create(:branch, organization: organization)
      property = build(:property, organization: organization, branch: branch)
      expect(property).to be_valid
    end

    it "is valid when branch_id is nil (unlinked)" do
      property = build(:property, organization: organization)
      expect(property).to be_valid
    end
  end
end
