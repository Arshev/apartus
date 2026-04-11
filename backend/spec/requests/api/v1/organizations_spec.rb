require "rails_helper"

RSpec.describe "Api::V1::Organizations" do
  let(:organization) { create(:organization, name: "Acme") }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }

  describe "GET /api/v1/organizations" do
    it "returns 401 without auth" do
      get "/api/v1/organizations"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns list of user's organizations" do
      other_org = create(:organization)
      create(:membership, :owner, user: user, organization: other_org)
      token = JsonWebToken.encode(user.id)
      get "/api/v1/organizations",
          headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:ok)
      ids = response.parsed_body.map { |o| o["id"] }
      expect(ids).to include(organization.id, other_org.id)
    end
  end

  describe "GET /api/v1/organization" do
    it "returns 401 without auth" do
      get "/api/v1/organization"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns current organization details" do
      get "/api/v1/organization", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["id"]).to eq(organization.id)
      expect(response.parsed_body["name"]).to eq("Acme")
    end
  end

  describe "PATCH /api/v1/organization" do
    it "updates organization name as owner" do
      patch "/api/v1/organization",
            params: { organization: { name: "Acme Inc" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(organization.reload.name).to eq("Acme Inc")
    end

    it "returns 422 when name is blank" do
      patch "/api/v1/organization",
            params: { organization: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "forbids update as member without permissions" do
      member_user = create(:user)
      create(:membership, user: member_user, organization: organization, role_enum: :member)
      member_headers = auth_headers(member_user, organization)
      patch "/api/v1/organization",
            params: { organization: { name: "Hacked" } }, headers: member_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "updates settings (Telegram config)" do
      patch "/api/v1/organization",
            params: { organization: { settings: { telegram_bot_token: "123:ABC", telegram_chat_id: "456" } } },
            headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["settings"]).to include("telegram_bot_token" => "123:ABC")
    end

    it "response includes currency_config and plan_config" do
      patch "/api/v1/organization",
            params: { organization: { name: "Updated" } }, headers: headers
      body = response.parsed_body
      expect(body).to have_key("currency_config")
      expect(body).to have_key("plan_config")
      expect(body).to have_key("settings")
    end
  end

  describe "POST /api/v1/organization/test_telegram" do
    it "returns success when Telegram is configured" do
      organization.update!(settings: { "telegram_bot_token" => "123:ABC", "telegram_chat_id" => "456" })
      allow(Net::HTTP).to receive(:post_form).and_return(
        instance_double(Net::HTTPSuccess, is_a?: true, code: "200", body: '{"ok":true}')
      )
      post "/api/v1/organization/test_telegram", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["message"]).to include("Test message sent")
    end

    it "returns 422 when Telegram is not configured" do
      organization.update!(settings: {})
      post "/api/v1/organization/test_telegram", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("not configured")
    end

    it "returns 403 for member without update permission" do
      member_user = create(:user)
      create(:membership, user: member_user, organization: organization, role_enum: :member)
      member_headers = auth_headers(member_user, organization)
      post "/api/v1/organization/test_telegram", headers: member_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
