require "rails_helper"

RSpec.describe "Api::V1::Reports" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/reports/financial"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/reports/financial" do
    it "returns financial report data" do
      get "/api/v1/reports/financial", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body).to have_key("total_revenue")
      expect(body).to have_key("total_expenses")
      expect(body).to have_key("net_income")
      expect(body).to have_key("occupancy_rate")
      expect(body).to have_key("adr")
      expect(body).to have_key("revpar")
    end

    it "accepts from/to params" do
      get "/api/v1/reports/financial", params: { from: "2026-01-01", to: "2026-01-31" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["from"]).to eq("2026-01-01")
    end
  end

  context "as member without finances.view" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) { create(:membership, user: nopriv_user, organization: organization, role_enum: :member) }
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "returns 403" do
      get "/api/v1/reports/financial", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
