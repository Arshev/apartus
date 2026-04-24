require "rails_helper"

RSpec.describe "Api::V1::ExchangeRates" do
  let(:organization) { create(:organization) }
  let(:other_org)    { create(:organization) }
  let(:user)         { create(:user) }
  let(:other_user)   { create(:user) }

  let!(:owner_membership)       { create(:membership, :owner, user: user, organization: organization) }
  let!(:other_owner_membership) { create(:membership, :owner, user: other_user, organization: other_org) }
  let(:headers) { auth_headers(user, organization) }
  let(:other_headers) { auth_headers(other_user, other_org) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/exchange_rates"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/exchange_rates" do
    it "returns api_rates + own manual_overrides; hides other-org overrides (NEG-04)" do
      api = create(:exchange_rate, source: "api", organization_id: nil,
                   base_currency: "USD", quote_currency: "RUB", effective_date: Date.current)
      own = create(:exchange_rate, :manual, organization: organization,
                   base_currency: "USD", quote_currency: "EUR", effective_date: Date.current)
      _theirs = create(:exchange_rate, :manual, organization: other_org,
                       base_currency: "USD", quote_currency: "THB", effective_date: Date.current)

      get "/api/v1/exchange_rates", headers: headers
      expect(response).to have_http_status(:ok)

      body = response.parsed_body
      expect(body["api_rates"].map { |r| r["id"] }).to include(api.id)
      expect(body["manual_overrides"].map { |r| r["id"] }).to contain_exactly(own.id)
      all_ids = body["api_rates"].map { |r| r["id"] } + body["manual_overrides"].map { |r| r["id"] }
      expect(all_ids).not_to include(_theirs.id)
    end
  end

  describe "POST /api/v1/exchange_rates" do
    let(:valid_params) do
      {
        exchange_rate: {
          base_currency: "USD",
          quote_currency: "RUB",
          rate_x1e10: 1_000_000_000_000,
          effective_date: Date.current.to_s,
          note: "CBR daily rate"
        }
      }
    end

    it "SC-05 — creates manual override and converter uses it for current org" do
      create(:exchange_rate, source: "api", organization_id: nil,
             base_currency: "USD", quote_currency: "RUB",
             rate_x1e10: 955_000_000_000, effective_date: Date.current)

      expect {
        post "/api/v1/exchange_rates", params: valid_params, headers: headers
      }.to change { ExchangeRate.count }.by(1)

      expect(response).to have_http_status(:created)
      expect(response.parsed_body["source"]).to eq("manual")
      expect(response.parsed_body["organization_id"]).to eq(organization.id)

      result_for_current = CurrencyConverter.convert(
        amount_cents: 10_000, from: "USD", to: "RUB", at: Date.current, organization: organization
      )
      expect(result_for_current).to eq(1_000_000)

      result_for_other = CurrencyConverter.convert(
        amount_cents: 10_000, from: "USD", to: "RUB", at: Date.current, organization: other_org
      )
      expect(result_for_other).to eq(955_000)
    end

    it "NEG-05 — rejects rate_x1e10 <= 0" do
      bad = valid_params.deep_dup
      bad[:exchange_rate][:rate_x1e10] = 0
      post "/api/v1/exchange_rates", params: bad, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "NEG-06 — rejects currency outside CurrencyConfig" do
      bad = valid_params.deep_dup
      bad[:exchange_rate][:base_currency] = "XYZ"
      post "/api/v1/exchange_rates", params: bad, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "NEG-07 — rejects duplicate (base, quote, date, source=manual, org)" do
      post "/api/v1/exchange_rates", params: valid_params, headers: headers
      post "/api/v1/exchange_rates", params: valid_params, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    context "NEG-03 — without permission" do
      let(:user_without) { create(:user) }
      let(:role)         { create(:role, organization: organization, permissions: [ "properties.view" ]) }
      let!(:plain)       { create(:membership, user: user_without, organization: organization, role: role, role_enum: :member) }
      let(:plain_headers) { auth_headers(user_without, organization) }

      it "returns 403" do
        post "/api/v1/exchange_rates", params: valid_params, headers: plain_headers
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  describe "PATCH /api/v1/exchange_rates/:id" do
    let(:own_rate) do
      create(:exchange_rate, :manual, organization: organization,
             base_currency: "USD", quote_currency: "RUB",
             rate_x1e10: 1_000_000_000_000, effective_date: Date.current)
    end

    it "updates own manual rate" do
      patch "/api/v1/exchange_rates/#{own_rate.id}",
            params: { exchange_rate: { rate_x1e10: 1_050_000_000_000 } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["rate_x1e10"]).to eq(1_050_000_000_000)
    end

    it "EC-04 — returns 404 for other-org rate (not in own-org scope)" do
      theirs = create(:exchange_rate, :manual, organization: other_org)
      patch "/api/v1/exchange_rates/#{theirs.id}",
            params: { exchange_rate: { rate_x1e10: 1_111_111_111_111 } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "EC-05 / NEG-08 — returns 403 for API row (organization_id IS NULL)" do
      api = create(:exchange_rate, source: "api", organization_id: nil,
                   base_currency: "USD", quote_currency: "EUR", effective_date: Date.current)
      patch "/api/v1/exchange_rates/#{api.id}",
            params: { exchange_rate: { rate_x1e10: 1 } }, headers: headers
      # Policy denies mutation of global rows — row is in read scope (global),
      # but ExchangeRatePolicy#update? returns false (CON-03).
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "DELETE /api/v1/exchange_rates/:id" do
    it "deletes own manual rate" do
      own = create(:exchange_rate, :manual, organization: organization,
                   base_currency: "USD", quote_currency: "RUB", effective_date: Date.current)
      expect {
        delete "/api/v1/exchange_rates/#{own.id}", headers: headers
      }.to change { ExchangeRate.count }.by(-1)
      expect(response).to have_http_status(:ok)
    end
  end
end
