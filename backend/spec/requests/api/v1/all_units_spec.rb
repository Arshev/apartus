require "rails_helper"

RSpec.describe "Api::V1::AllUnits" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "GET /api/v1/all_units" do
    it "returns all units across properties" do
      p1 = create(:property, organization: organization)
      p2 = create(:property, organization: organization)
      create(:unit, property: p1)
      create(:unit, property: p2)
      get "/api/v1/all_units", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(2)
      expect(response.parsed_body.first).to have_key("property_name")
    end

    it "does not include units from other orgs" do
      other_org = create(:organization)
      other_prop = create(:property, organization: other_org)
      create(:unit, property: other_prop)
      get "/api/v1/all_units", headers: headers
      expect(response.parsed_body).to be_empty
    end
  end
end
