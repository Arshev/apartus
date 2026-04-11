require "rails_helper"

RSpec.describe "Api::V1::Dashboard" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/dashboard"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/dashboard" do
    it "returns dashboard data" do
      get "/api/v1/dashboard", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body).to have_key("total_units")
      expect(body).to have_key("occupied_units")
      expect(body).to have_key("occupancy_rate")
      expect(body).to have_key("revenue_this_month")
      expect(body).to have_key("upcoming_check_ins")
      expect(body).to have_key("upcoming_check_outs")
      expect(body).to have_key("reservations_by_status")
    end

    it "returns correct unit counts" do
      property = create(:property, organization: organization)
      create(:unit, property: property)
      create(:unit, property: property)
      get "/api/v1/dashboard", headers: headers
      expect(response.parsed_body["total_units"]).to eq(2)
    end
  end

  context "as member without finances.view" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) { create(:membership, user: nopriv_user, organization: organization, role_enum: :member) }
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "returns 403" do
      get "/api/v1/dashboard", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
