require "rails_helper"

RSpec.describe "Api::V1::Owners" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/owners"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/owners" do
    it "returns owners ordered by name" do
      create(:owner, organization: organization, name: "Zara")
      create(:owner, organization: organization, name: "Alice")
      get "/api/v1/owners", headers: headers
      names = response.parsed_body.map { |o| o["name"] }
      expect(names).to eq(%w[Alice Zara])
    end

    it "includes properties_count" do
      owner = create(:owner, organization: organization)
      create(:property, organization: organization, owner: owner)
      get "/api/v1/owners", headers: headers
      expect(response.parsed_body.first["properties_count"]).to eq(1)
    end
  end

  describe "GET /api/v1/owners/:id" do
    it "returns the owner with all fields" do
      owner = create(:owner, organization: organization, name: "Bob", commission_rate: 1500)
      get "/api/v1/owners/#{owner.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["name"]).to eq("Bob")
      expect(body["commission_rate"]).to eq(1500)
    end

    it "returns 404 for non-existing" do
      get "/api/v1/owners/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/owners" do
    it "creates an owner" do
      expect {
        post "/api/v1/owners", params: { owner: { name: "Bob", commission_rate: 1000 } }, headers: headers
      }.to change(Owner, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 422 for missing name" do
      post "/api/v1/owners", params: { owner: { commission_rate: 1000 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/owners/:id" do
    let(:owner) { create(:owner, organization: organization) }

    it "updates the owner" do
      patch "/api/v1/owners/#{owner.id}", params: { owner: { name: "Updated" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("Updated")
    end

    it "returns 422 on invalid update" do
      patch "/api/v1/owners/#{owner.id}", params: { owner: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/owners/:id" do
    it "deletes the owner" do
      owner = create(:owner, organization: organization)
      expect {
        delete "/api/v1/owners/#{owner.id}", headers: headers
      }.to change(Owner, :count).by(-1)
    end
  end

  # ---------------------------------------------------------------------------
  # Statement — financial formulas
  # ---------------------------------------------------------------------------
  describe "GET /api/v1/owners/:id/statement" do
    let(:owner) { create(:owner, organization: organization, commission_rate: 2000) } # 20%
    let(:property) { create(:property, organization: organization, owner: owner) }
    let(:unit) { create(:unit, property: property) }

    it "returns all expected keys" do
      get "/api/v1/owners/#{owner.id}/statement", headers: headers
      body = response.parsed_body
      %w[owner_name from to commission_rate total_revenue total_expenses
         commission net_payout properties].each do |key|
        expect(body).to have_key(key), "Expected key '#{key}'"
      end
    end

    context "with known financial data" do
      before do
        create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 5,
               status: :confirmed, total_price_cents: 100_000)
        create(:expense, organization: organization, property: property,
               amount_cents: 10_000, expense_date: Date.current)
      end

      it "commission = revenue * commission_rate / 10000" do
        get "/api/v1/owners/#{owner.id}/statement", headers: headers
        body = response.parsed_body
        expected_commission = (100_000 * 2000 / 10_000.0).round
        expect(body["commission"]).to eq(expected_commission) # 20_000
      end

      it "net_payout = revenue - commission - expenses" do
        get "/api/v1/owners/#{owner.id}/statement", headers: headers
        body = response.parsed_body
        expected = body["total_revenue"] - body["commission"] - body["total_expenses"]
        expect(body["net_payout"]).to eq(expected)
      end

      it "total_revenue sums reservation prices for owner's properties" do
        get "/api/v1/owners/#{owner.id}/statement", headers: headers
        expect(response.parsed_body["total_revenue"]).to eq(100_000)
      end

      it "total_expenses sums expenses for owner's properties" do
        get "/api/v1/owners/#{owner.id}/statement", headers: headers
        expect(response.parsed_body["total_expenses"]).to eq(10_000)
      end
    end

    context "per-property breakdown" do
      let(:property_b) { create(:property, organization: organization, owner: owner, name: "Prop B") }
      let(:unit_b) { create(:unit, property: property_b) }

      before do
        create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 3,
               status: :confirmed, total_price_cents: 60_000)
        create(:reservation, unit: unit_b, check_in: Date.current, check_out: Date.current + 2,
               status: :confirmed, total_price_cents: 40_000)
        create(:expense, organization: organization, property: property,
               amount_cents: 5_000, expense_date: Date.current)
      end

      it "properties array has entry per property with revenue/commission/expenses/payout" do
        get "/api/v1/owners/#{owner.id}/statement", headers: headers
        properties = response.parsed_body["properties"]
        expect(properties.length).to eq(2)

        prop_a = properties.find { |p| p["property_name"] == property.name }
        expect(prop_a["revenue"]).to eq(60_000)
        expect(prop_a["commission"]).to eq((60_000 * 2000 / 10_000.0).round)
        expect(prop_a["expenses"]).to eq(5_000)
        expect(prop_a["payout"]).to eq(60_000 - prop_a["commission"] - 5_000)

        prop_b_data = properties.find { |p| p["property_name"] == "Prop B" }
        expect(prop_b_data["revenue"]).to eq(40_000)
        expect(prop_b_data["expenses"]).to eq(0) # no expenses for prop B
      end
    end

    it "excludes cancelled reservations from revenue" do
      create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 3,
             status: :cancelled, total_price_cents: 999_999)
      get "/api/v1/owners/#{owner.id}/statement", headers: headers
      expect(response.parsed_body["total_revenue"]).to eq(0)
    end

    it "returns zeros for owner with no properties" do
      ownerless = create(:owner, organization: organization, commission_rate: 1000)
      get "/api/v1/owners/#{ownerless.id}/statement", headers: headers
      body = response.parsed_body
      expect(body["total_revenue"]).to eq(0)
      expect(body["net_payout"]).to eq(0)
    end

    it "respects from/to date params" do
      create(:reservation, unit: unit, check_in: "2027-01-05", check_out: "2027-01-10",
             status: :confirmed, total_price_cents: 50_000)
      get "/api/v1/owners/#{owner.id}/statement",
          params: { from: "2027-01-01", to: "2027-01-31" }, headers: headers
      expect(response.parsed_body["from"]).to eq("2027-01-01")
      expect(response.parsed_body["total_revenue"]).to eq(50_000)
    end

    it "returns PDF when format=pdf" do
      get "/api/v1/owners/#{owner.id}/statement",
          params: { format: "pdf" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.content_type).to include("application/pdf")
      expect(response.headers["Content-Disposition"]).to include("attachment")
    end

    it "defaults invalid from/to to current month" do
      get "/api/v1/owners/#{owner.id}/statement",
          params: { from: "not-a-date", to: "garbage" }, headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["from"]).to eq(Date.current.beginning_of_month.to_s)
    end

    # -------------------------------------------------------------------------
    # FT-038: Owner statement in owner's currency
    # -------------------------------------------------------------------------
    describe "currency conversion (FT-038)" do
      let(:org_rub) { create(:organization, currency: "RUB") }
      let(:rub_user) { create(:user) }
      let!(:rub_owner_membership) { create(:membership, :owner, user: rub_user, organization: org_rub) }
      let(:rub_headers) { auth_headers(rub_user, org_rub) }

      it "EC-03 — no preferred_currency → pre-FT-038 behaviour (no conversion fields significant)" do
        o = create(:owner, organization: org_rub, commission_rate: 2000, preferred_currency: nil)
        get "/api/v1/owners/#{o.id}/statement", headers: rub_headers
        body = response.parsed_body
        expect(body["currency"]).to eq("RUB")
        expect(body["fx_rate_x1e10"]).to be_nil
        expect(body["currency_fallback_reason"]).to be_nil
      end

      it "EC-03 — preferred_currency == org.currency → no conversion" do
        o = create(:owner, organization: org_rub, commission_rate: 2000, preferred_currency: "RUB")
        get "/api/v1/owners/#{o.id}/statement", headers: rub_headers
        body = response.parsed_body
        expect(body["currency"]).to eq("RUB")
        expect(body["fx_rate_x1e10"]).to be_nil
      end

      it "SC-01 — RUB org, USD owner, stored USD→RUB rate → conversion applied" do
        o = create(:owner, organization: org_rub, commission_rate: 2000, preferred_currency: "USD")
        prop = create(:property, organization: org_rub, owner: o)
        unit = create(:unit, property: prop)
        create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 1,
               status: :confirmed, total_price_cents: 1_000_000) # 10 000 RUB
        create(:exchange_rate, source: "api", organization_id: nil,
               base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 1_000_000_000_000, effective_date: Date.current) # 100 RUB per USD

        get "/api/v1/owners/#{o.id}/statement", headers: rub_headers
        body = response.parsed_body
        expect(body["currency"]).to eq("USD")
        expect(body["total_revenue"]).to eq(10_000) # 1_000_000 RUB cents → 10_000 USD cents
        expect(body["fx_rate_x1e10"]).to eq(100_000_000) # effective forward RUB→USD per DEC-01
        expect(body["currency_fallback_reason"]).to be_nil
      end

      it "NEG-01 — RateNotFound → graceful fallback to org currency" do
        o = create(:owner, organization: org_rub, commission_rate: 2000, preferred_currency: "USD")
        prop = create(:property, organization: org_rub, owner: o)
        unit = create(:unit, property: prop)
        create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 1,
               status: :confirmed, total_price_cents: 1_000_000)
        # No ExchangeRate row seeded — RateNotFound expected

        get "/api/v1/owners/#{o.id}/statement", headers: rub_headers
        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["currency"]).to eq("RUB")
        expect(body["fx_rate_x1e10"]).to be_nil
        expect(body["currency_fallback_reason"]).to eq("rate_not_found")
        expect(body["total_revenue"]).to eq(1_000_000) # original org-currency value preserved
      end

      it "NEG-02 — future period clamped to today (FM-02/CON-02)" do
        o = create(:owner, organization: org_rub, commission_rate: 2000, preferred_currency: "USD")
        prop = create(:property, organization: org_rub, owner: o)
        unit = create(:unit, property: prop)
        future_to = Date.current + 60
        create(:reservation, unit: unit, check_in: Date.current, check_out: Date.current + 1,
               status: :confirmed, total_price_cents: 1_000_000)
        # Rate stored only on today; future_to would be RateNotFound without clamp
        create(:exchange_rate, source: "api", organization_id: nil,
               base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 1_000_000_000_000, effective_date: Date.current)

        get "/api/v1/owners/#{o.id}/statement",
            params: { from: Date.current.to_s, to: future_to.to_s }, headers: rub_headers
        body = response.parsed_body
        expect(body["currency"]).to eq("USD")
        expect(body["currency_fallback_reason"]).to be_nil
      end

      it "NEG-03 — PATCH with invalid preferred_currency → 422, not persisted" do
        o = create(:owner, organization: org_rub, commission_rate: 2000)
        patch "/api/v1/owners/#{o.id}",
              params: { owner: { preferred_currency: "XYZ" } }, headers: rub_headers
        expect(response).to have_http_status(:unprocessable_entity)
        expect(o.reload.preferred_currency).to be_nil
      end

      it "NEG-04 — foreign org owner → 404 on statement (PCON-01)" do
        other_org = create(:organization)
        other_owner = create(:owner, organization: other_org, preferred_currency: "USD")
        get "/api/v1/owners/#{other_owner.id}/statement", headers: rub_headers
        expect(response).to have_http_status(:not_found)
      end

      it "JSON owner PATCH accepts preferred_currency and persists" do
        o = create(:owner, organization: org_rub, commission_rate: 2000)
        patch "/api/v1/owners/#{o.id}",
              params: { owner: { preferred_currency: "EUR" } }, headers: rub_headers
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["preferred_currency"]).to eq("EUR")
        expect(o.reload.preferred_currency).to eq("EUR")
      end
    end
  end

  context "cross-org isolation" do
    let(:other_org) { create(:organization) }
    let(:other_owner) { create(:owner, organization: other_org) }

    it "returns 404 for other org's owner" do
      get "/api/v1/owners/#{other_owner.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for other org's owner statement" do
      get "/api/v1/owners/#{other_owner.id}/statement", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
