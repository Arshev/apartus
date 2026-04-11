require "rails_helper"

RSpec.describe "Api::V1::NotificationLogs" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }
  let(:reservation) { create(:reservation, unit: unit) }

  describe "GET /api/v1/reservations/:reservation_id/notifications" do
    it "returns notification logs for a reservation" do
      create(:notification_log, reservation: reservation)
      get "/api/v1/reservations/#{reservation.id}/notifications", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(1)
      expect(response.parsed_body.first).to have_key("event_type")
    end

    it "returns 404 for reservation from another org" do
      other_org = create(:organization)
      other_prop = create(:property, organization: other_org)
      other_unit = create(:unit, property: other_prop)
      other_res = create(:reservation, unit: other_unit)
      get "/api/v1/reservations/#{other_res.id}/notifications", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
