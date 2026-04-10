require "rails_helper"

RSpec.describe "Api::V1::SeasonalPrices" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }

  describe "GET /units/:unit_id/seasonal_prices" do
    it "returns seasonal prices for unit" do
      create(:seasonal_price, unit: unit, start_date: "2026-06-01", end_date: "2026-08-31", price_cents: 8000)
      get "/api/v1/units/#{unit.id}/seasonal_prices", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.size).to eq(1)
      expect(body.first["price_cents"]).to eq(8000)
    end
  end

  describe "POST /units/:unit_id/seasonal_prices" do
    it "creates seasonal price" do
      post "/api/v1/units/#{unit.id}/seasonal_prices", params: {
        seasonal_price: { start_date: "2026-07-01", end_date: "2026-07-31", price_cents: 6000 }
      }, headers: headers
      expect(response).to have_http_status(:created)
    end

    it "returns 422 on invalid dates" do
      post "/api/v1/units/#{unit.id}/seasonal_prices", params: {
        seasonal_price: { start_date: "2026-07-31", end_date: "2026-07-01", price_cents: 6000 }
      }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /units/:unit_id/seasonal_prices/:id" do
    it "destroys" do
      sp = create(:seasonal_price, unit: unit, start_date: "2026-09-01", end_date: "2026-09-30")
      delete "/api/v1/units/#{unit.id}/seasonal_prices/#{sp.id}", headers: headers
      expect(response).to have_http_status(:no_content)
    end
  end
end
