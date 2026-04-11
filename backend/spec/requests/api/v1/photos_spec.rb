require "rails_helper"

RSpec.describe "Api::V1::Photos" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }

  describe "GET /api/v1/properties/:property_id/photos" do
    it "returns empty array for property with no photos" do
      get "/api/v1/properties/#{property.id}/photos", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns 404 for property from another org" do
      other_prop = create(:property)
      get "/api/v1/properties/#{other_prop.id}/photos", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns photos for unit via unit_id" do
      unit = create(:unit, property: property)
      get "/api/v1/units/#{unit.id}/photos", headers: headers
      expect(response).to have_http_status(:ok)
    end

    it "returns photo JSON with id, filename, content_type, byte_size, url" do
      # Attach a real image
      unit = create(:unit, property: property)
      file = fixture_file_upload(Rails.root.join("Gemfile"), "image/jpeg")
      unit.photos.attach(io: File.open(Rails.root.join("Gemfile")), filename: "test.jpg", content_type: "image/jpeg")
      get "/api/v1/properties/#{property.id}/photos", headers: headers
      # Photos are on property, not unit — attach to property
      property.photos.attach(io: File.open(Rails.root.join("Gemfile")), filename: "test.jpg", content_type: "image/jpeg")
      get "/api/v1/properties/#{property.id}/photos", headers: headers
      expect(response).to have_http_status(:ok)
      photo = response.parsed_body.first
      expect(photo).to have_key("id")
      expect(photo).to have_key("filename")
      expect(photo).to have_key("content_type")
      expect(photo).to have_key("byte_size")
      expect(photo).to have_key("url")
    end
  end

  describe "POST /api/v1/properties/:property_id/photos" do
    it "returns 422 without files" do
      post "/api/v1/properties/#{property.id}/photos", headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("No files")
    end

    it "rejects text/plain content type" do
      file = Rack::Test::UploadedFile.new(Rails.root.join("Gemfile"), "text/plain")
      post "/api/v1/properties/#{property.id}/photos", params: { photo: file }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("Invalid file type")
    end

    it "rejects application/zip content type" do
      file = Rack::Test::UploadedFile.new(Rails.root.join("Gemfile"), "application/zip")
      post "/api/v1/properties/#{property.id}/photos", params: { photo: file }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "error message lists allowed MIME types" do
      file = Rack::Test::UploadedFile.new(Rails.root.join("Gemfile"), "text/html")
      post "/api/v1/properties/#{property.id}/photos", params: { photo: file }, headers: headers
      expect(response.parsed_body["error"]).to include("image/jpeg")
    end

    it "uploads valid image file and returns 201" do
      file = Rack::Test::UploadedFile.new(Rails.root.join("Gemfile"), "image/jpeg")
      post "/api/v1/properties/#{property.id}/photos", params: { photo: file }, headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body).to be_an(Array)
      expect(response.parsed_body.first).to have_key("id")
    end

    it "rejects file exceeding MAX_SIZE" do
      # Create a large temp file > 10MB
      large_file = Tempfile.new([ "large", ".jpg" ])
      large_file.write("\xFF\xD8\xFF\xE0" + "\x00" * (11 * 1024 * 1024))
      large_file.rewind
      file = Rack::Test::UploadedFile.new(large_file.path, "image/jpeg")
      post "/api/v1/properties/#{property.id}/photos", params: { photo: file }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to include("too large")
      large_file.unlink
    end
  end

  describe "DELETE /api/v1/properties/:property_id/photos/:id" do
    it "returns 404 for non-existing photo" do
      delete "/api/v1/properties/#{property.id}/photos/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for another org's property" do
      other_prop = create(:property)
      delete "/api/v1/properties/#{other_prop.id}/photos/1", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "deletes existing photo and returns 204" do
      property.photos.attach(io: File.open(Rails.root.join("Gemfile")), filename: "delete-me.jpg", content_type: "image/jpeg")
      photo_id = property.photos.last.id
      delete "/api/v1/properties/#{property.id}/photos/#{photo_id}", headers: headers
      expect(response).to have_http_status(:no_content)
    end
  end
end
