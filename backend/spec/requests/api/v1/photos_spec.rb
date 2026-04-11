require "rails_helper"

RSpec.describe "Api::V1::Photos" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }

  describe "GET /api/v1/properties/:property_id/photos" do
    it "returns photos for a property" do
      get "/api/v1/properties/#{property.id}/photos", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns 404 for property from another org" do
      other_prop = create(:property)
      get "/api/v1/properties/#{other_prop.id}/photos", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/properties/:property_id/photos" do
    it "returns 422 without files" do
      post "/api/v1/properties/#{property.id}/photos", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "rejects invalid content type" do
      file = Rack::Test::UploadedFile.new(
        Rails.root.join("Gemfile"), "text/plain"
      )
      post "/api/v1/properties/#{property.id}/photos",
           params: { photo: file },
           headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/properties/:property_id/photos/:id" do
    it "returns 404 for non-existing photo" do
      delete "/api/v1/properties/#{property.id}/photos/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
