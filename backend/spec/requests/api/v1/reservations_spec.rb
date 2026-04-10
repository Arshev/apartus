require "rails_helper"

RSpec.describe "Api::V1::Reservations" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }
  let(:guest) { create(:guest, organization: organization) }

  describe "GET /api/v1/reservations" do
    it "returns org reservations" do
      create(:reservation, unit: unit, check_in: "2026-05-01", check_out: "2026-05-05")
      get "/api/v1/reservations", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body.size).to eq(1)
      expect(parsed_body.first).to include("unit_name", "property_name", "status")
    end

    it "filters by unit_id" do
      other_unit = create(:unit, property: property, name: "Other")
      create(:reservation, unit: unit, check_in: "2026-06-01", check_out: "2026-06-03")
      create(:reservation, unit: other_unit, check_in: "2026-06-01", check_out: "2026-06-03")
      get "/api/v1/reservations", params: { unit_id: unit.id }, headers: headers
      expect(parsed_body.size).to eq(1)
    end

    it "does not return cross-org reservations" do
      other_org = create(:organization)
      other_prop = create(:property, organization: other_org)
      other_unit = create(:unit, property: other_prop)
      create(:reservation, unit: other_unit, check_in: "2026-07-01", check_out: "2026-07-03")
      get "/api/v1/reservations", headers: headers
      expect(parsed_body).to be_empty
    end
  end

  describe "POST /api/v1/reservations" do
    it "creates reservation" do
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, guest_id: guest.id, check_in: "2026-08-01", check_out: "2026-08-05", guests_count: 2, total_price_cents: 20_000 }
      }, headers: headers
      expect(response).to have_http_status(:created)
      expect(parsed_body["guest_name"]).to eq(guest.full_name)
    end

    it "creates reservation without guest (date block)" do
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, check_in: "2026-09-01", check_out: "2026-09-03", guests_count: 1 }
      }, headers: headers
      expect(response).to have_http_status(:created)
      expect(parsed_body["guest_id"]).to be_nil
    end

    it "returns 422 on overlapping dates" do
      create(:reservation, unit: unit, check_in: "2026-10-01", check_out: "2026-10-10")
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, check_in: "2026-10-05", check_out: "2026-10-15", guests_count: 1 }
      }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when check_out <= check_in" do
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, check_in: "2026-11-05", check_out: "2026-11-03", guests_count: 1 }
      }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 for cross-org unit" do
      other_org = create(:organization)
      other_unit = create(:unit, property: create(:property, organization: other_org))
      post "/api/v1/reservations", params: {
        reservation: { unit_id: other_unit.id, check_in: "2026-12-01", check_out: "2026-12-03", guests_count: 1 }
      }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "status transitions" do
    let!(:reservation) { create(:reservation, unit: unit, check_in: "2026-05-10", check_out: "2026-05-15") }

    it "check_in: confirmed → checked_in" do
      patch "/api/v1/reservations/#{reservation.id}/check_in", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body["status"]).to eq("checked_in")
    end

    it "check_out: checked_in → checked_out" do
      reservation.update!(status: :checked_in)
      patch "/api/v1/reservations/#{reservation.id}/check_out", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body["status"]).to eq("checked_out")
    end

    it "cancel: confirmed → cancelled" do
      patch "/api/v1/reservations/#{reservation.id}/cancel", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body["status"]).to eq("cancelled")
    end

    it "check_in on checked_out → 422" do
      reservation.update!(status: :checked_out)
      patch "/api/v1/reservations/#{reservation.id}/check_in", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/reservations/:id" do
    it "destroys" do
      reservation = create(:reservation, unit: unit, check_in: "2026-06-10", check_out: "2026-06-15")
      delete "/api/v1/reservations/#{reservation.id}", headers: headers
      expect(response).to have_http_status(:ok)
    end
  end

  private

  def parsed_body
    JSON.parse(response.body)
  end
end
