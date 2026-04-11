require "rails_helper"

RSpec.describe "Api::V1::Dashboard" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/dashboard"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/dashboard" do
    it "returns all expected keys" do
      get "/api/v1/dashboard", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      %w[total_units occupied_units occupancy_rate revenue_this_month
         upcoming_check_ins upcoming_check_outs reservations_by_status].each do |key|
        expect(body).to have_key(key)
      end
    end

    context "with known data" do
      let(:property) { create(:property, organization: organization) }
      let!(:unit_a) { create(:unit, property: property) }
      let!(:unit_b) { create(:unit, property: property) }
      let(:today) { Date.current }

      it "total_units matches actual unit count" do
        get "/api/v1/dashboard", headers: headers
        expect(response.parsed_body["total_units"]).to eq(2)
      end

      it "occupied_units counts units with active reservations today" do
        create(:reservation, unit: unit_a, check_in: today - 1, check_out: today + 2, status: :checked_in)
        get "/api/v1/dashboard", headers: headers
        expect(response.parsed_body["occupied_units"]).to eq(1)
      end

      it "occupancy_rate = occupied / total (as decimal)" do
        create(:reservation, unit: unit_a, check_in: today - 1, check_out: today + 2, status: :confirmed)
        get "/api/v1/dashboard", headers: headers
        # 1 out of 2 units occupied = 0.5
        expect(response.parsed_body["occupancy_rate"]).to eq(0.5)
      end

      it "occupancy_rate is 0 when no reservations" do
        get "/api/v1/dashboard", headers: headers
        expect(response.parsed_body["occupancy_rate"]).to eq(0.0)
      end

      it "revenue_this_month sums active reservation prices overlapping current month" do
        month_start = today.beginning_of_month
        create(:reservation, unit: unit_a, check_in: month_start, check_out: month_start + 5,
               status: :confirmed, total_price_cents: 30_000)
        create(:reservation, unit: unit_b, check_in: month_start + 1, check_out: month_start + 3,
               status: :checked_out, total_price_cents: 15_000)
        # Cancelled should NOT count
        create(:reservation, unit: unit_a, check_in: month_start + 10, check_out: month_start + 15,
               status: :cancelled, total_price_cents: 99_999)
        get "/api/v1/dashboard", headers: headers
        expect(response.parsed_body["revenue_this_month"]).to eq(45_000)
      end

      it "upcoming_check_ins returns confirmed reservations in next 7 days, ordered by check_in" do
        r_near = create(:reservation, unit: unit_a, check_in: today + 1, check_out: today + 3,
                        status: :confirmed, total_price_cents: 10_000)
        r_far = create(:reservation, unit: unit_b, check_in: today + 5, check_out: today + 7,
                       status: :confirmed, total_price_cents: 20_000)
        # Beyond 7 days — should not appear
        create(:reservation, unit: unit_a, check_in: today + 10, check_out: today + 12, status: :confirmed)
        get "/api/v1/dashboard", headers: headers
        check_ins = response.parsed_body["upcoming_check_ins"]
        expect(check_ins.length).to eq(2)
        expect(check_ins.first["id"]).to eq(r_near.id)
        expect(check_ins.last["id"]).to eq(r_far.id)
      end

      it "upcoming_check_ins item includes unit_name and guest_name" do
        guest = create(:guest, organization: organization)
        create(:reservation, unit: unit_a, guest: guest, check_in: today + 1, check_out: today + 3,
               status: :confirmed)
        get "/api/v1/dashboard", headers: headers
        item = response.parsed_body["upcoming_check_ins"].first
        expect(item["unit_name"]).to eq(unit_a.name)
        expect(item["guest_name"]).to eq(guest.full_name)
      end

      it "upcoming_check_outs returns checked_in reservations checking out in 7 days" do
        create(:reservation, unit: unit_a, check_in: today - 2, check_out: today + 2,
               status: :checked_in)
        get "/api/v1/dashboard", headers: headers
        expect(response.parsed_body["upcoming_check_outs"].length).to eq(1)
      end

      it "reservations_by_status returns counts per status" do
        create(:reservation, unit: unit_a, check_in: today - 10, check_out: today - 5, status: :checked_out)
        create(:reservation, unit: unit_a, check_in: today + 1, check_out: today + 3, status: :confirmed)
        create(:reservation, unit: unit_b, check_in: today + 2, check_out: today + 4, status: :confirmed)
        create(:reservation, unit: unit_a, check_in: today + 20, check_out: today + 25, status: :cancelled)
        get "/api/v1/dashboard", headers: headers
        counts = response.parsed_body["reservations_by_status"]
        expect(counts["confirmed"]).to eq(2)
        expect(counts["checked_out"]).to eq(1)
        expect(counts["cancelled"]).to eq(1)
        expect(counts["checked_in"]).to eq(0)
      end
    end

    it "does not count units from other orgs" do
      other_org = create(:organization)
      other_prop = create(:property, organization: other_org)
      create(:unit, property: other_prop)
      get "/api/v1/dashboard", headers: headers
      expect(response.parsed_body["total_units"]).to eq(0)
    end
  end

  context "as member without finances.view" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) { create(:membership, user: nopriv_user, organization: organization, role_enum: :member) }
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "returns 403" do
      get "/api/v1/dashboard", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
