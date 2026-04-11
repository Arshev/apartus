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

  describe "PATCH /units/:unit_id/seasonal_prices/:id" do
    let!(:sp) { create(:seasonal_price, unit: unit, start_date: "2026-06-01", end_date: "2026-06-30", price_cents: 5000) }

    it "updates seasonal price" do
      patch "/api/v1/units/#{unit.id}/seasonal_prices/#{sp.id}",
            params: { seasonal_price: { price_cents: 9000 } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["price_cents"]).to eq(9000)
    end

    it "returns 422 on invalid dates" do
      patch "/api/v1/units/#{unit.id}/seasonal_prices/#{sp.id}",
            params: { seasonal_price: { end_date: "2026-05-01" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 for non-existing id" do
      patch "/api/v1/units/#{unit.id}/seasonal_prices/999999",
            params: { seasonal_price: { price_cents: 1 } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for cross-org unit" do
      other_unit = create(:unit)
      patch "/api/v1/units/#{other_unit.id}/seasonal_prices/#{sp.id}",
            params: { seasonal_price: { price_cents: 1 } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /units/:unit_id/seasonal_prices/:id" do
    it "destroys and returns 204" do
      sp = create(:seasonal_price, unit: unit, start_date: "2026-09-01", end_date: "2026-09-30")
      expect {
        delete "/api/v1/units/#{unit.id}/seasonal_prices/#{sp.id}", headers: headers
      }.to change(SeasonalPrice, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 for non-existing" do
      delete "/api/v1/units/#{unit.id}/seasonal_prices/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
