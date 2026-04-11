require "rails_helper"

RSpec.describe "Api::V1::PricingRules" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }

  describe "GET /api/v1/pricing_rules" do
    it "returns pricing rules for the org" do
      create(:pricing_rule, unit: unit)
      get "/api/v1/pricing_rules", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(1)
    end
  end

  describe "POST /api/v1/pricing_rules" do
    it "creates a pricing rule" do
      expect {
        post "/api/v1/pricing_rules", params: {
          pricing_rule: { unit_id: unit.id, rule_type: "length_discount", min_nights: 5, discount_percent: 10 }
        }, headers: headers
      }.to change(PricingRule, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 404 for unit from another org" do
      other_unit = create(:unit)
      post "/api/v1/pricing_rules", params: {
        pricing_rule: { unit_id: other_unit.id, rule_type: "length_discount", min_nights: 5, discount_percent: 10 }
      }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 422 for invalid create (length_discount without min_nights)" do
      post "/api/v1/pricing_rules", params: {
        pricing_rule: { unit_id: unit.id, rule_type: "length_discount", min_nights: -1, discount_percent: 10 }
      }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/pricing_rules/:id" do
    let(:rule) { create(:pricing_rule, unit: unit) }

    it "updates the rule" do
      patch "/api/v1/pricing_rules/#{rule.id}", params: { pricing_rule: { discount_percent: 20 } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["discount_percent"]).to eq(20)
    end

    it "returns 422 on invalid update" do
      patch "/api/v1/pricing_rules/#{rule.id}", params: { pricing_rule: { discount_percent: 999 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/pricing_rules/:id" do
    it "deletes the rule" do
      rule = create(:pricing_rule, unit: unit)
      expect {
        delete "/api/v1/pricing_rules/#{rule.id}", headers: headers
      }.to change(PricingRule, :count).by(-1)
    end
  end

  context "cross-org isolation" do
    let(:other_rule) { create(:pricing_rule) }

    it "returns 404" do
      patch "/api/v1/pricing_rules/#{other_rule.id}", params: { pricing_rule: { discount_percent: 99 } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
