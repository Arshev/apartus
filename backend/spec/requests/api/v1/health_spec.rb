require "rails_helper"

RSpec.describe "Api::V1::Health" do
  describe "GET /api/v1/health" do
    it "returns ok status" do
      get "/api/v1/health"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq("status" => "ok")
    end
  end
end
