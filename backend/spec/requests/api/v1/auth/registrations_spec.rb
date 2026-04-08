require "rails_helper"

RSpec.describe "Api::V1::Auth::Registrations" do
  describe "POST /api/v1/auth/sign_up" do
    let(:valid_params) do
      {
        email: "new@example.com",
        password: "password123",
        password_confirmation: "password123",
        first_name: "John",
        last_name: "Doe",
        organization_name: "My Company"
      }
    end

    it "creates user and organization" do
      expect {
        post "/api/v1/auth/sign_up", params: valid_params
      }.to change(User, :count).by(1)
        .and change(Organization, :count).by(1)
        .and change(Membership, :count).by(1)

      expect(response).to have_http_status(:created)
      body = response.parsed_body
      expect(body["token"]).to be_present
      expect(body["refresh_token"]).to be_present
      expect(body["user"]["email"]).to eq("new@example.com")
      expect(body["organization"]["name"]).to eq("My Company")
    end

    it "creates owner membership" do
      post "/api/v1/auth/sign_up", params: valid_params
      membership = Membership.last
      expect(membership.role_enum).to eq("owner")
    end

    it "creates preset roles for organization" do
      post "/api/v1/auth/sign_up", params: valid_params
      org = Organization.last
      expect(org.roles.count).to eq(3)
    end

    it "returns error for invalid params" do
      post "/api/v1/auth/sign_up", params: valid_params.merge(email: "")
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns error for short password" do
      post "/api/v1/auth/sign_up", params: valid_params.merge(password: "short", password_confirmation: "short")
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
