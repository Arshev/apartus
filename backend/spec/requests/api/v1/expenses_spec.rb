require "rails_helper"

RSpec.describe "Api::V1::Expenses" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/expenses"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/expenses" do
    it "returns expenses for the organization" do
      create(:expense, organization: organization, amount_cents: 5000)
      get "/api/v1/expenses", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(1)
    end

    it "filters by category" do
      create(:expense, organization: organization, category: :maintenance)
      create(:expense, organization: organization, category: :cleaning)
      get "/api/v1/expenses", params: { category: "cleaning" }, headers: headers
      expect(response.parsed_body.length).to eq(1)
      expect(response.parsed_body.first["category"]).to eq("cleaning")
    end
  end

  describe "POST /api/v1/expenses" do
    let(:valid_params) { { expense: { amount_cents: 5000, expense_date: Date.current.to_s, category: "maintenance" } } }

    it "creates an expense" do
      expect {
        post "/api/v1/expenses", params: valid_params, headers: headers
      }.to change(Expense, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 422 for missing amount" do
      post "/api/v1/expenses", params: { expense: { expense_date: Date.current.to_s, category: "maintenance" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/expenses/:id" do
    let(:expense) { create(:expense, organization: organization) }

    it "updates the expense" do
      patch "/api/v1/expenses/#{expense.id}", params: { expense: { amount_cents: 9999 } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["amount_cents"]).to eq(9999)
    end

    it "returns 422 on invalid update" do
      patch "/api/v1/expenses/#{expense.id}", params: { expense: { amount_cents: -1 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/expenses/:id" do
    it "deletes the expense" do
      expense = create(:expense, organization: organization)
      expect {
        delete "/api/v1/expenses/#{expense.id}", headers: headers
      }.to change(Expense, :count).by(-1)
    end
  end

  context "cross-org isolation" do
    let(:other_org) { create(:organization) }
    let(:other_expense) { create(:expense, organization: other_org) }

    it "returns 404 for other org's expense" do
      patch "/api/v1/expenses/#{other_expense.id}", params: { expense: { amount_cents: 1 } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
