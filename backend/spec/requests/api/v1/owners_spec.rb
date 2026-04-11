require "rails_helper"

RSpec.describe "Api::V1::Owners" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/owners"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/owners" do
    it "returns owners for the organization" do
      create(:owner, organization: organization, name: "Alice")
      get "/api/v1/owners", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(1)
      expect(response.parsed_body.first["name"]).to eq("Alice")
    end
  end

  describe "GET /api/v1/owners/:id" do
    it "returns the owner" do
      owner = create(:owner, organization: organization)
      get "/api/v1/owners/#{owner.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(owner.id)
    end

    it "returns 404 for non-existing" do
      get "/api/v1/owners/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/owners" do
    it "creates an owner" do
      expect {
        post "/api/v1/owners", params: { owner: { name: "Bob", commission_rate: 1000 } }, headers: headers
      }.to change(Owner, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 422 for missing name" do
      post "/api/v1/owners", params: { owner: { commission_rate: 1000 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/owners/:id" do
    let(:owner) { create(:owner, organization: organization) }

    it "updates the owner" do
      patch "/api/v1/owners/#{owner.id}", params: { owner: { name: "Updated" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("Updated")
    end
  end

  describe "DELETE /api/v1/owners/:id" do
    it "deletes the owner" do
      owner = create(:owner, organization: organization)
      expect {
        delete "/api/v1/owners/#{owner.id}", headers: headers
      }.to change(Owner, :count).by(-1)
    end
  end

  describe "GET /api/v1/owners/:id/statement" do
    it "returns statement data" do
      owner = create(:owner, organization: organization, commission_rate: 1000)
      get "/api/v1/owners/#{owner.id}/statement", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body).to have_key("owner_name")
      expect(body).to have_key("total_revenue")
      expect(body).to have_key("net_payout")
    end
  end

  context "cross-org isolation" do
    let(:other_org) { create(:organization) }
    let(:other_owner) { create(:owner, organization: other_org) }

    it "returns 404 for other org's owner" do
      get "/api/v1/owners/#{other_owner.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
