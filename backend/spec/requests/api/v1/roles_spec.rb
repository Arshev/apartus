require "rails_helper"

RSpec.describe "Api::V1::Roles" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/roles"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/roles" do
    it "returns system roles" do
      get "/api/v1/roles", headers: headers
      expect(response).to have_http_status(:ok)
      codes = response.parsed_body.map { |r| r["code"] }
      expect(codes).to include("admin", "manager", "viewer")
    end
  end

  describe "POST /api/v1/roles" do
    let(:valid_params) { { role: { name: "Auditor", code: "auditor", permissions: %w[properties.view] } } }

    it "creates a custom role" do
      expect {
        post "/api/v1/roles", params: valid_params, headers: headers
      }.to change(Role, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Auditor")
    end

    it "returns 422 for duplicate code" do
      post "/api/v1/roles", params: valid_params, headers: headers
      post "/api/v1/roles", params: valid_params, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/roles/:id" do
    let(:role) { create(:role, organization: organization, name: "Old") }

    it "updates the role" do
      patch "/api/v1/roles/#{role.id}", params: { role: { name: "New" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("New")
    end
  end

  describe "DELETE /api/v1/roles/:id" do
    it "deletes a custom role" do
      role = create(:role, organization: organization, is_system: false)
      expect {
        delete "/api/v1/roles/#{role.id}", headers: headers
      }.to change(Role, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "forbids deleting system role" do
      system_role = organization.roles.find_by(is_system: true)
      delete "/api/v1/roles/#{system_role.id}", headers: headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "cross-org isolation" do
    let(:other_org) { create(:organization) }
    let(:other_role) { create(:role, organization: other_org) }

    it "cannot update role from another org" do
      patch "/api/v1/roles/#{other_role.id}", params: { role: { name: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  context "as member without roles.manage" do
    let(:viewer_user) { create(:user) }
    let(:viewer_role) { organization.roles.find_by(code: "viewer") }
    let!(:viewer_membership) do
      create(:membership, user: viewer_user, organization: organization, role: viewer_role, role_enum: :member)
    end
    let(:viewer_headers) { auth_headers(viewer_user, organization) }

    it "allows index" do
      get "/api/v1/roles", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "forbids create" do
      post "/api/v1/roles", params: { role: { name: "X", code: "x" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
