require "rails_helper"

RSpec.describe "Api::V1::Auth::Sessions" do
  let(:user) { create(:user, password: "password123") }
  let(:organization) { create(:organization) }
  let!(:membership) { create(:membership, :owner, user: user, organization: organization) }

  describe "POST /api/v1/auth/sign_in" do
    it "returns tokens and user data" do
      post "/api/v1/auth/sign_in", params: { email: user.email, password: "password123" }

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["token"]).to be_present
      expect(body["refresh_token"]).to be_present
      expect(body["user"]["email"]).to eq(user.email)
      expect(body["organizations"]).to be_an(Array)
      expect(body["organizations"].first["id"]).to eq(organization.id)
    end

    it "returns unauthorized for wrong password" do
      post "/api/v1/auth/sign_in", params: { email: user.email, password: "wrong" }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns unauthorized for non-existent email" do
      post "/api/v1/auth/sign_in", params: { email: "no@example.com", password: "password123" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/auth/me" do
    it "returns current user info" do
      get "/api/v1/auth/me", headers: auth_headers(user, organization)

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["user"]["id"]).to eq(user.id)
      expect(body["organization"]["id"]).to eq(organization.id)
      expect(body["membership"]["role"]).to eq("owner")
    end

    it "returns unauthorized without token" do
      get "/api/v1/auth/me"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "POST /api/v1/auth/refresh" do
    it "returns new tokens" do
      tokens = JsonWebToken.encode_pair(user.id)

      post "/api/v1/auth/refresh", params: { refresh_token: tokens[:refresh_token] }

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["token"]).to be_present
      expect(body["refresh_token"]).to be_present
    end

    it "returns unauthorized for invalid refresh token" do
      post "/api/v1/auth/refresh", params: { refresh_token: "invalid" }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE /api/v1/auth/sign_out" do
    it "revokes token and returns success" do
      delete "/api/v1/auth/sign_out", headers: auth_headers(user)

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["message"]).to eq("Logged out")
    end
  end
end
