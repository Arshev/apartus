require "rails_helper"

RSpec.describe "Api::V1::Public::Bookings" do
  let(:organization) { create(:organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property, base_price_cents: 10_000) }

  describe "GET /api/v1/public/properties/:slug/availability" do
    it "returns available units" do
      unit
      get "/api/v1/public/properties/#{organization.slug}/availability",
          params: { from: (Date.current + 1).to_s, to: (Date.current + 3).to_s }
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["units"].length).to eq(1)
      expect(body["units"].first["name"]).to eq(unit.name)
    end

    it "excludes units with overlapping reservations" do
      create(:reservation, unit: unit, check_in: Date.current + 1, check_out: Date.current + 5, status: :confirmed)
      get "/api/v1/public/properties/#{organization.slug}/availability",
          params: { from: (Date.current + 2).to_s, to: (Date.current + 4).to_s }
      expect(response.parsed_body["units"]).to be_empty
    end

    it "returns 404 for unknown slug" do
      get "/api/v1/public/properties/nonexistent/availability"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/public/properties/:slug/bookings" do
    let(:valid_params) do
      {
        unit_id: unit.id,
        check_in: (Date.current + 1).to_s,
        check_out: (Date.current + 3).to_s,
        guests_count: 2
      }
    end

    it "creates a reservation" do
      expect {
        post "/api/v1/public/properties/#{organization.slug}/bookings", params: valid_params
      }.to change(Reservation, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["unit_name"]).to eq(unit.name)
    end

    it "creates a reservation with guest" do
      allow(NotificationSender).to receive(:send_booking_confirmation)
      params = valid_params.merge(guest_email: "test@test.com", guest_name: "John Doe")
      expect {
        post "/api/v1/public/properties/#{organization.slug}/bookings", params: params
      }.to change(Guest, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 404 for unknown slug" do
      post "/api/v1/public/properties/nonexistent/bookings", params: valid_params
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for unknown unit" do
      post "/api/v1/public/properties/#{organization.slug}/bookings",
           params: valid_params.merge(unit_id: 999999)
      expect(response).to have_http_status(:not_found)
    end

    it "returns 422 for invalid dates" do
      post "/api/v1/public/properties/#{organization.slug}/bookings",
           params: valid_params.merge(check_in: "invalid")
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
