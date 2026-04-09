require "rails_helper"

RSpec.describe "Api::V1::Amenities" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }

  describe "without auth token" do
    it "returns 401 for index" do
      get "/api/v1/amenities"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for show" do
      amenity = create(:amenity, organization: organization)
      get "/api/v1/amenities/#{amenity.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for create" do
      post "/api/v1/amenities", params: { amenity: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for update" do
      amenity = create(:amenity, organization: organization)
      patch "/api/v1/amenities/#{amenity.id}", params: { amenity: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for destroy" do
      amenity = create(:amenity, organization: organization)
      delete "/api/v1/amenities/#{amenity.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "without X-Organization-Id header" do
    it "returns 422 with 'Organization not selected' on GET index" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/amenities", headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq("error" => "Organization not selected")
    end
  end

  describe "GET /api/v1/amenities" do
    it "returns [] for empty organization" do
      get "/api/v1/amenities", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns amenities sorted by id" do
      a1 = create(:amenity, organization: organization, name: "Alpha")
      a2 = create(:amenity, organization: organization, name: "Beta")
      get "/api/v1/amenities", headers: headers
      ids = response.parsed_body.map { |a| a["id"] }
      expect(ids).to eq([ a1.id, a2.id ])
    end
  end

  describe "GET /api/v1/amenities/:id" do
    it "returns amenity as JSON with exactly the documented keys" do
      amenity = create(:amenity, organization: organization, name: "Wi-Fi")
      get "/api/v1/amenities/#{amenity.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["id"]).to eq(amenity.id)
      expect(body["name"]).to eq("Wi-Fi")
      expect(body["organization_id"]).to eq(organization.id)
      expected_keys = %w[id organization_id name created_at updated_at]
      expect(body.keys).to match_array(expected_keys)
    end

    it "returns 404 for non-existing id" do
      get "/api/v1/amenities/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/amenities" do
    let(:valid_attrs) { { name: "Wi-Fi" } }

    it "creates amenity and returns 201" do
      expect do
        post "/api/v1/amenities", params: { amenity: valid_attrs }, headers: headers
      end.to change(Amenity, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Wi-Fi")
      expect(response.parsed_body["organization_id"]).to eq(organization.id)
    end

    it "trims whitespace in name" do
      post "/api/v1/amenities",
           params: { amenity: { name: "  Pool  " } }, headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Pool")
    end

    it "ignores organization_id passed in the body" do
      other_org = create(:organization)
      post "/api/v1/amenities",
           params: { amenity: valid_attrs.merge(organization_id: other_org.id) },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["organization_id"]).to eq(organization.id)
      expect(Amenity.last.organization_id).to eq(organization.id)
    end

    it "returns 422 when name is blank" do
      post "/api/v1/amenities",
           params: { amenity: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("Name")
    end

    it "returns 422 when name is whitespace-only" do
      post "/api/v1/amenities",
           params: { amenity: { name: "   " } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when name is too long (>100)" do
      post "/api/v1/amenities",
           params: { amenity: { name: "x" * 101 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when case-insensitive duplicate" do
      create(:amenity, organization: organization, name: "Wi-Fi")
      post "/api/v1/amenities",
           params: { amenity: { name: "wi-fi" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("taken")
    end

    it "returns 422 when uppercase duplicate of same normalized name" do
      create(:amenity, organization: organization, name: "Pool")
      post "/api/v1/amenities",
           params: { amenity: { name: "POOL" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when whitespace-trimmed duplicate" do
      create(:amenity, organization: organization, name: "Wi-Fi")
      post "/api/v1/amenities",
           params: { amenity: { name: "  Wi-Fi  " } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 400 when 'amenity' key is missing" do
      post "/api/v1/amenities", params: { something_else: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "PATCH /api/v1/amenities/:id" do
    let(:amenity) { create(:amenity, organization: organization, name: "Old") }

    it "updates name and returns 200" do
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { name: "New" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(amenity.reload.name).to eq("New")
    end

    it "trims whitespace in name on update" do
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { name: "  Updated  " } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(amenity.reload.name).to eq("Updated")
    end

    it "ignores organization_id in the body" do
      other_org = create(:organization)
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { organization_id: other_org.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(amenity.reload.organization_id).to eq(organization.id)
    end

    it "returns 200 when updating with the same name (not a duplicate)" do
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { name: "Old" } }, headers: headers
      expect(response).to have_http_status(:ok)
    end

    it "returns 422 when name set to blank" do
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(amenity.reload.name).to eq("Old")
    end

    it "returns 422 when renamed to duplicate of another amenity" do
      create(:amenity, organization: organization, name: "Existing")
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { name: "existing" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 for non-existing id" do
      patch "/api/v1/amenities/999999",
            params: { amenity: { name: "X" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/v1/amenities/:id" do
    it "deletes amenity without attachments and returns 204" do
      amenity = create(:amenity, organization: organization)
      expect do
        delete "/api/v1/amenities/#{amenity.id}", headers: headers
      end.to change(Amenity, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 409 with error array when amenity is in use" do
      amenity = create(:amenity, organization: organization)
      property = create(:property, organization: organization)
      unit = create(:unit, property: property)
      UnitAmenity.create!(unit: unit, amenity: amenity)

      expect do
        delete "/api/v1/amenities/#{amenity.id}", headers: headers
      end.not_to change(Amenity, :count)
      expect(response).to have_http_status(:conflict)
      expect(response.parsed_body["error"]).to eq([ "Amenity is in use and cannot be deleted" ])
    end

    it "returns 404 for non-existing id" do
      delete "/api/v1/amenities/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  context "with another organization's amenity (AC3)" do
    let(:other_org) { create(:organization) }
    let!(:other_amenity) { create(:amenity, organization: other_org, name: "Other") }

    it "is not visible in index" do
      create(:amenity, organization: organization, name: "Mine")
      get "/api/v1/amenities", headers: headers
      names = response.parsed_body.map { |a| a["name"] }
      expect(names).to include("Mine")
      expect(names).not_to include("Other")
    end

    it "show returns 404" do
      get "/api/v1/amenities/#{other_amenity.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "update returns 404" do
      patch "/api/v1/amenities/#{other_amenity.id}",
            params: { amenity: { name: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
      expect(other_amenity.reload.name).to eq("Other")
    end

    it "destroy returns 404" do
      expect do
        delete "/api/v1/amenities/#{other_amenity.id}", headers: headers
      end.not_to change(Amenity, :count)
      expect(response).to have_http_status(:not_found)
    end
  end

  context "as a viewer (amenities.view only, AC7)" do
    let(:viewer_user) { create(:user) }
    let(:viewer_role) { organization.roles.find_by(code: "viewer") }
    let!(:viewer_membership) do
      create(:membership,
             user: viewer_user,
             organization: organization,
             role: viewer_role,
             role_enum: :member)
    end
    let(:viewer_headers) { auth_headers(viewer_user, organization) }
    let!(:amenity) { create(:amenity, organization: organization) }

    it "allows index" do
      get "/api/v1/amenities", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "allows show" do
      get "/api/v1/amenities/#{amenity.id}", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "forbids create with 403" do
      post "/api/v1/amenities",
           params: { amenity: { name: "X" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids update with 403" do
      patch "/api/v1/amenities/#{amenity.id}",
            params: { amenity: { name: "X" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids destroy with 403" do
      delete "/api/v1/amenities/#{amenity.id}", headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a member without any amenity permissions (AC8)" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "forbids index with 403" do
      get "/api/v1/amenities", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids show with 403" do
      amenity = create(:amenity, organization: organization)
      get "/api/v1/amenities/#{amenity.id}", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids create with 403" do
      post "/api/v1/amenities",
           params: { amenity: { name: "X" } }, headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
