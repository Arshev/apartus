require "rails_helper"

RSpec.describe "Api::V1::Public::Ical" do
  let(:organization) { create(:organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }
  let(:channel) { create(:channel, unit: unit) }

  describe "GET /api/v1/public/ical/:token" do
    it "returns iCal data" do
      create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 3, status: :confirmed)
      get "/api/v1/public/ical/#{channel.ical_export_token}"
      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("text/calendar")
      expect(response.body).to include("BEGIN:VCALENDAR")
      expect(response.body).to include("BEGIN:VEVENT")
    end

    it "returns 404 for invalid token" do
      get "/api/v1/public/ical/invalid-token"
      expect(response).to have_http_status(:not_found)
    end

    it "only includes active reservations" do
      create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 3, status: :cancelled)
      get "/api/v1/public/ical/#{channel.ical_export_token}"
      expect(response.body).not_to include("BEGIN:VEVENT")
    end
  end
end
