require "rails_helper"

RSpec.describe "Api::V1::Channels" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/channels"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/channels" do
    it "returns channels for the org" do
      create(:channel, unit: unit)
      get "/api/v1/channels", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(1)
      expect(response.parsed_body.first).to have_key("platform")
    end
  end

  describe "POST /api/v1/channels" do
    it "creates a channel" do
      expect {
        post "/api/v1/channels", params: { channel: { unit_id: unit.id, platform: "airbnb" } }, headers: headers
      }.to change(Channel, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 404 for unit from another org" do
      other_unit = create(:unit)
      post "/api/v1/channels", params: { channel: { unit_id: other_unit.id, platform: "airbnb" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "PATCH /api/v1/channels/:id" do
    let(:channel) { create(:channel, unit: unit) }

    it "updates the channel" do
      patch "/api/v1/channels/#{channel.id}", params: { channel: { ical_import_url: "https://example.com/cal.ics" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["ical_import_url"]).to eq("https://example.com/cal.ics")
    end
  end

  describe "DELETE /api/v1/channels/:id" do
    it "deletes the channel" do
      channel = create(:channel, unit: unit)
      expect {
        delete "/api/v1/channels/#{channel.id}", headers: headers
      }.to change(Channel, :count).by(-1)
    end
  end

  describe "POST /api/v1/channels/:id/sync" do
    it "returns 422 without import URL" do
      channel = create(:channel, unit: unit, ical_import_url: nil)
      post "/api/v1/channels/#{channel.id}/sync", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "enqueues sync job with import URL" do
      channel = create(:channel, unit: unit, ical_import_url: "https://example.com/cal.ics")
      post "/api/v1/channels/#{channel.id}/sync", headers: headers
      expect(response).to have_http_status(:ok)
    end
  end

  context "cross-org isolation" do
    let(:other_org) { create(:organization) }
    let(:other_prop) { create(:property, organization: other_org) }
    let(:other_unit) { create(:unit, property: other_prop) }
    let(:other_channel) { create(:channel, unit: other_unit) }

    it "returns 404 for other org's channel" do
      patch "/api/v1/channels/#{other_channel.id}", params: { channel: { platform: "airbnb" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
