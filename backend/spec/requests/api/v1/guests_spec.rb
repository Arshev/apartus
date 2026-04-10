require "rails_helper"

RSpec.describe "Api::V1::Guests" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }

  # --- Unauthenticated ---
  describe "without auth token" do
    it "returns 401 for index" do
      get "/api/v1/guests"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # --- Index ---
  describe "GET /api/v1/guests" do
    it "returns guests for current organization" do
      create(:guest, organization: organization, first_name: "Alice")
      create(:guest, organization: organization, first_name: "Bob")

      get "/api/v1/guests", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body.size).to eq(2)
      expect(parsed_body.first).to include("first_name" => "Alice")
    end

    it "does not return guests from other organizations" do
      other_org = create(:organization)
      create(:guest, organization: other_org, first_name: "Hidden")

      get "/api/v1/guests", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body).to be_empty
    end
  end

  # --- Show ---
  describe "GET /api/v1/guests/:id" do
    it "returns guest" do
      guest = create(:guest, organization: organization)
      get "/api/v1/guests/#{guest.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body["first_name"]).to eq(guest.first_name)
      expect(parsed_body["full_name"]).to eq(guest.full_name)
    end

    it "returns 404 for cross-org guest" do
      other_org = create(:organization)
      guest = create(:guest, organization: other_org)
      get "/api/v1/guests/#{guest.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # --- Create ---
  describe "POST /api/v1/guests" do
    let(:valid_params) do
      { guest: { first_name: "Jane", last_name: "Doe", email: "jane@example.com", phone: "+123" } }
    end

    it "creates guest" do
      post "/api/v1/guests", params: valid_params, headers: headers
      expect(response).to have_http_status(:created)
      expect(parsed_body["first_name"]).to eq("Jane")
      expect(parsed_body["organization_id"]).to eq(organization.id)
    end

    it "returns 422 on missing first_name" do
      post "/api/v1/guests", params: { guest: { last_name: "Doe" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 on duplicate email in same org" do
      create(:guest, organization: organization, email: "dupe@test.com")
      post "/api/v1/guests", params: { guest: { first_name: "A", last_name: "B", email: "dupe@test.com" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "allows blank email (no uniqueness conflict)" do
      create(:guest, organization: organization, email: nil)
      post "/api/v1/guests", params: { guest: { first_name: "A", last_name: "B", email: "" } }, headers: headers
      expect(response).to have_http_status(:created)
    end
  end

  # --- Update ---
  describe "PATCH /api/v1/guests/:id" do
    it "updates guest" do
      guest = create(:guest, organization: organization)
      patch "/api/v1/guests/#{guest.id}", params: { guest: { first_name: "Updated" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body["first_name"]).to eq("Updated")
    end

    it "returns 404 for cross-org" do
      other_org = create(:organization)
      guest = create(:guest, organization: other_org)
      patch "/api/v1/guests/#{guest.id}", params: { guest: { first_name: "X" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # --- Destroy ---
  describe "DELETE /api/v1/guests/:id" do
    it "destroys guest" do
      guest = create(:guest, organization: organization)
      delete "/api/v1/guests/#{guest.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(Guest.find_by(id: guest.id)).to be_nil
    end

    it "returns 404 for cross-org" do
      other_org = create(:organization)
      guest = create(:guest, organization: other_org)
      delete "/api/v1/guests/#{guest.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  private

  def parsed_body
    JSON.parse(response.body)
  end
end
