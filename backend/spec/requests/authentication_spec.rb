require "rails_helper"

RSpec.describe "Authentication edge cases" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:membership) { create(:membership, :owner, user: user, organization: organization) }

  describe "token validation" do
    it "rejects request with no Authorization header" do
      get "/api/v1/properties", headers: { "X-Organization-Id" => organization.id.to_s }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects request with invalid token" do
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer invalid-garbage-token",
        "X-Organization-Id" => organization.id.to_s
      }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects request with expired token" do
      payload = { user_id: user.id, type: "access", jti: SecureRandom.uuid, exp: 1.hour.ago.to_i }
      expired_token = JWT.encode(payload, Rails.application.secret_key_base, "HS256")
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{expired_token}",
        "X-Organization-Id" => organization.id.to_s
      }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects refresh token used as access token" do
      refresh_token = JsonWebToken.encode_refresh(user.id)
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{refresh_token}",
        "X-Organization-Id" => organization.id.to_s
      }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects token for deleted user" do
      token = JsonWebToken.encode(user.id)
      user.destroy!
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{token}",
        "X-Organization-Id" => organization.id.to_s
      }
      expect(response).to have_http_status(:unauthorized)
    end

    it "rejects revoked token (in denylist)" do
      token = JsonWebToken.encode(user.id)
      JsonWebToken.revoke(token)
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{token}",
        "X-Organization-Id" => organization.id.to_s
      }
      expect(response).to have_http_status(:unauthorized)
    end

    it "accepts valid access token" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{token}",
        "X-Organization-Id" => organization.id.to_s
      }
      expect(response).to have_http_status(:ok)
    end
  end

  describe "organization selection" do
    it "returns 422 without X-Organization-Id" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/properties", headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq("Organization not selected")
    end

    it "returns 404 for non-existing organization" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{token}",
        "X-Organization-Id" => "999999"
      }
      expect(response).to have_http_status(:not_found)
      expect(response.parsed_body["error"]).to eq("Organization not found")
    end

    it "returns 403 when user is not member of organization" do
      other_org = create(:organization)
      token = JsonWebToken.encode(user.id)
      get "/api/v1/properties", headers: {
        "Authorization" => "Bearer #{token}",
        "X-Organization-Id" => other_org.id.to_s
      }
      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body["error"]).to eq("Not a member of this organization")
    end
  end
end
