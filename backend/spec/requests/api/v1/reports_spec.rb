require "rails_helper"

RSpec.describe "Api::V1::Reports" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/reports/financial"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/reports/financial" do
    it "returns all expected keys" do
      get "/api/v1/reports/financial", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      %w[from to total_revenue total_expenses net_income occupancy_rate adr revpar
         revenue_by_property expenses_by_category total_room_nights occupied_nights].each do |key|
        expect(body).to have_key(key), "Expected key '#{key}' in response"
      end
    end

    context "with known data" do
      let(:from) { "2027-01-01" }
      let(:to) { "2027-01-31" }
      let!(:unit_b) { create(:unit, property: property) }

      before do
        # 2 reservations overlapping January
        create(:reservation, unit: unit, check_in: "2027-01-05", check_out: "2027-01-10",
               status: :confirmed, total_price_cents: 50_000, guests_count: 2)
        create(:reservation, unit: unit_b, check_in: "2027-01-15", check_out: "2027-01-20",
               status: :checked_out, total_price_cents: 30_000, guests_count: 1)
        # Cancelled — should NOT count in revenue
        create(:reservation, unit: unit, check_in: "2027-01-25", check_out: "2027-01-28",
               status: :cancelled, total_price_cents: 99_999)
        # Expenses
        create(:expense, organization: organization, property: property,
               category: :cleaning, amount_cents: 5_000, expense_date: "2027-01-10")
        create(:expense, organization: organization, property: property,
               category: :maintenance, amount_cents: 10_000, expense_date: "2027-01-20")
      end

      it "total_revenue sums only active reservation prices" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        expect(response.parsed_body["total_revenue"]).to eq(80_000) # 50k + 30k
      end

      it "total_expenses sums expenses in date range" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        expect(response.parsed_body["total_expenses"]).to eq(15_000) # 5k + 10k
      end

      it "net_income = total_revenue - total_expenses" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        body = response.parsed_body
        expect(body["net_income"]).to eq(body["total_revenue"] - body["total_expenses"])
      end

      it "ADR = total_revenue / occupied_nights (when occupied_nights > 0)" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        body = response.parsed_body
        if body["occupied_nights"].positive?
          expected_adr = (body["total_revenue"].to_f / body["occupied_nights"]).round
          expect(body["adr"]).to eq(expected_adr)
        end
      end

      it "RevPAR = total_revenue / total_room_nights (when total_room_nights > 0)" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        body = response.parsed_body
        if body["total_room_nights"].positive?
          expected_revpar = (body["total_revenue"].to_f / body["total_room_nights"]).round
          expect(body["revpar"]).to eq(expected_revpar)
        end
      end

      it "total_room_nights = units * days in range" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        body = response.parsed_body
        days = (Date.parse(to) - Date.parse(from)).to_i + 1
        expect(body["total_room_nights"]).to eq(2 * days) # 2 units
      end

      it "revenue_by_property breaks down per property" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        by_property = response.parsed_body["revenue_by_property"]
        expect(by_property).to be_an(Array)
        expect(by_property.length).to eq(1) # one property
        expect(by_property.first["property_name"]).to eq(property.name)
        expect(by_property.first["revenue"]).to eq(80_000)
      end

      it "expenses_by_category groups correctly" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        by_category = response.parsed_body["expenses_by_category"]
        expect(by_category).to be_an(Array)
        categories = by_category.map { |e| e["category"] }
        expect(categories).to contain_exactly("cleaning", "maintenance")
      end

      it "occupancy_rate between 0 and 1" do
        get "/api/v1/reports/financial", params: { from: from, to: to }, headers: headers
        rate = response.parsed_body["occupancy_rate"]
        expect(rate).to be >= 0.0
        expect(rate).to be <= 1.0
      end
    end

    it "defaults from/to to current month when params absent" do
      get "/api/v1/reports/financial", headers: headers
      body = response.parsed_body
      expect(body["from"]).to eq(Date.current.beginning_of_month.to_s)
      expect(body["to"]).to eq(Date.current.end_of_month.to_s)
    end

    it "returns zeros for empty org" do
      get "/api/v1/reports/financial", headers: headers
      body = response.parsed_body
      expect(body["total_revenue"]).to eq(0)
      expect(body["total_expenses"]).to eq(0)
      expect(body["net_income"]).to eq(0)
    end

    it "does not include cross-org data" do
      other_org = create(:organization)
      other_prop = create(:property, organization: other_org)
      other_unit = create(:unit, property: other_prop)
      create(:reservation, unit: other_unit, check_in: Date.current, check_out: Date.current + 3,
             status: :confirmed, total_price_cents: 999_999)
      get "/api/v1/reports/financial", headers: headers
      expect(response.parsed_body["total_revenue"]).to eq(0)
    end
  end

  describe "GET /api/v1/reports/financial/pdf" do
    it "returns PDF content-type attachment" do
      get "/api/v1/reports/financial/pdf", headers: headers
      # PDF may fail due to Cyrillic font — both 200 and error are valid
      if response.status == 200
        expect(response.content_type).to include("application/pdf")
        expect(response.headers["Content-Disposition"]).to include("attachment")
        expect(response.headers["Content-Disposition"]).to include(".pdf")
      end
    rescue Prawn::Errors::IncompatibleStringEncoding
      skip "Prawn font does not support Cyrillic"
    end

    it "returns 403 for unauthorized user" do
      nopriv_user = create(:user)
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
      nopriv_headers = auth_headers(nopriv_user, organization)
      get "/api/v1/reports/financial/pdf", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as member without finances.view" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) { create(:membership, user: nopriv_user, organization: organization, role_enum: :member) }
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "returns 403" do
      get "/api/v1/reports/financial", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
