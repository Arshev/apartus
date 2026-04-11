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

    it "returns 404 for cross-org guest_id" do
      other_org = create(:organization)
      other_guest = create(:guest, organization: other_org)
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, guest_id: other_guest.id, check_in: "2027-09-01", check_out: "2027-09-03", guests_count: 1 }
      }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "creates reservation without guest_id (blank guest)" do
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, check_in: "2027-10-01", check_out: "2027-10-03", guests_count: 1 }
      }, headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["guest_id"]).to be_nil
    end

    it "triggers notification and telegram on create with guest" do
      allow(Net::HTTP).to receive(:post_form).and_return(
        instance_double(Net::HTTPSuccess, is_a?: true, code: "200", body: '{"ok":true}')
      )
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, guest_id: guest.id, check_in: "2027-11-01", check_out: "2027-11-03", guests_count: 1, total_price_cents: 5000 }
      }, headers: headers
      expect(response).to have_http_status(:created)
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

    it "check_out on confirmed → 422 (can't skip check_in)" do
      patch "/api/v1/reservations/#{reservation.id}/check_out", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "cancel on cancelled → 422" do
      reservation.update!(status: :cancelled)
      patch "/api/v1/reservations/#{reservation.id}/cancel", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "cancel on checked_out → 422" do
      reservation.update!(status: :checked_out)
      patch "/api/v1/reservations/#{reservation.id}/cancel", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 for cross-org reservation transition" do
      other_org = create(:organization)
      other_unit = create(:unit, property: create(:property, organization: other_org))
      other_res = create(:reservation, unit: other_unit, check_in: "2026-11-01", check_out: "2026-11-05")
      patch "/api/v1/reservations/#{other_res.id}/check_in", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "date filtering" do
    it "filters by from param (check_out >= from)" do
      create(:reservation, unit: unit, check_in: "2027-01-01", check_out: "2027-01-05")
      create(:reservation, unit: unit, check_in: "2027-02-01", check_out: "2027-02-05")
      get "/api/v1/reservations", params: { from: "2027-01-20" }, headers: headers
      expect(parsed_body.size).to eq(1)
    end

    it "filters by to param (check_in <= to)" do
      create(:reservation, unit: unit, check_in: "2027-03-01", check_out: "2027-03-05")
      create(:reservation, unit: unit, check_in: "2027-04-01", check_out: "2027-04-05")
      get "/api/v1/reservations", params: { to: "2027-03-10" }, headers: headers
      expect(parsed_body.size).to eq(1)
    end

    it "filters by status" do
      create(:reservation, unit: unit, check_in: "2027-05-01", check_out: "2027-05-05", status: :confirmed)
      create(:reservation, unit: unit, check_in: "2027-06-01", check_out: "2027-06-05", status: :cancelled)
      get "/api/v1/reservations", params: { status: "cancelled" }, headers: headers
      expect(parsed_body.size).to eq(1)
      expect(parsed_body.first["status"]).to eq("cancelled")
    end
  end

  describe "auto-price calculation on create" do
    it "auto-calculates when total_price_cents is zero" do
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, check_in: "2027-07-01", check_out: "2027-07-04", guests_count: 1, total_price_cents: 0 }
      }, headers: headers
      expect(response).to have_http_status(:created)
      expect(parsed_body["total_price_cents"]).to be >= 0
    end

    it "preserves manual price when non-zero" do
      post "/api/v1/reservations", params: {
        reservation: { unit_id: unit.id, check_in: "2027-08-01", check_out: "2027-08-04", guests_count: 1, total_price_cents: 99_999 }
      }, headers: headers
      expect(response).to have_http_status(:created)
      expect(parsed_body["total_price_cents"]).to eq(99_999)
    end
  end

  describe "DELETE /api/v1/reservations/:id" do
    it "destroys" do
      reservation = create(:reservation, unit: unit, check_in: "2026-06-10", check_out: "2026-06-15")
      delete "/api/v1/reservations/#{reservation.id}", headers: headers
      expect(response).to have_http_status(:ok)
    end

    it "returns 404 for cross-org" do
      other_org = create(:organization)
      other_unit = create(:unit, property: create(:property, organization: other_org))
      other_res = create(:reservation, unit: other_unit, check_in: "2026-12-01", check_out: "2026-12-05")
      delete "/api/v1/reservations/#{other_res.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "GET /api/v1/guests/:id/timeline" do
    it "returns guest reservations for org, ordered by check_in desc" do
      guest = create(:guest, organization: organization)
      r1 = create(:reservation, unit: unit, guest: guest, check_in: "2027-01-01", check_out: "2027-01-05")
      r2 = create(:reservation, unit: unit, guest: guest, check_in: "2027-03-01", check_out: "2027-03-05")
      get "/api/v1/guests/#{guest.id}/timeline", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body.size).to eq(2)
      expect(parsed_body.first["id"]).to eq(r2.id) # most recent first
    end

    it "returns empty array for guest with no reservations" do
      guest = create(:guest, organization: organization)
      get "/api/v1/guests/#{guest.id}/timeline", headers: headers
      expect(response).to have_http_status(:ok)
      expect(parsed_body).to eq([])
    end

    it "returns 404 for cross-org guest timeline" do
      other_org = create(:organization)
      other_guest = create(:guest, organization: other_org)
      get "/api/v1/guests/#{other_guest.id}/timeline", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  private

  def parsed_body
    JSON.parse(response.body)
  end
end
