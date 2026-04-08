require "rails_helper"

RSpec.describe "Api::V1::Properties" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }

  # ---------------------------------------------------------------------------
  # AC5 — Unauthenticated
  # ---------------------------------------------------------------------------
  describe "without auth token" do
    it "returns 401 for index" do
      get "/api/v1/properties"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for show" do
      property = create(:property, organization: organization)
      get "/api/v1/properties/#{property.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for create" do
      post "/api/v1/properties", params: { property: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for update" do
      property = create(:property, organization: organization)
      patch "/api/v1/properties/#{property.id}", params: { property: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for destroy" do
      property = create(:property, organization: organization)
      delete "/api/v1/properties/#{property.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ---------------------------------------------------------------------------
  # AC11 — Missing X-Organization-Id
  # ---------------------------------------------------------------------------
  describe "without X-Organization-Id header" do
    it "returns 422 with 'Organization not selected'" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/properties", headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq("error" => "Organization not selected")
    end
  end

  # ---------------------------------------------------------------------------
  # AC1 — Happy path CRUD as owner
  # ---------------------------------------------------------------------------
  describe "GET /api/v1/properties" do
    it "returns [] for an empty organization" do
      get "/api/v1/properties", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns properties of the current organization sorted by id" do
      p1 = create(:property, organization: organization, name: "Alpha")
      p2 = create(:property, organization: organization, name: "Beta")
      get "/api/v1/properties", headers: headers
      expect(response).to have_http_status(:ok)
      ids = response.parsed_body.map { |p| p["id"] }
      expect(ids).to eq([ p1.id, p2.id ])
    end
  end

  describe "GET /api/v1/properties/:id" do
    it "returns the property as JSON" do
      property = create(:property, organization: organization, name: "Villa")
      get "/api/v1/properties/#{property.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["id"]).to eq(property.id)
      expect(body["name"]).to eq("Villa")
      expect(body["organization_id"]).to eq(organization.id)
    end

    it "returns 404 for a non-existing id" do
      get "/api/v1/properties/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/properties" do
    let(:valid_attrs) do
      {
        name: "Sea View Apartment",
        address: "1 Beach Rd, Bali",
        property_type: "apartment",
        description: "Nice place"
      }
    end

    it "creates a property with valid attributes and returns 201" do
      expect do
        post "/api/v1/properties", params: { property: valid_attrs }, headers: headers
      end.to change(Property, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Sea View Apartment")
      expect(response.parsed_body["organization_id"]).to eq(organization.id)
    end

    it "accepts description as null" do
      post "/api/v1/properties",
           params: { property: valid_attrs.merge(description: nil) },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["description"]).to be_nil
    end

    it "accepts description as empty string" do
      post "/api/v1/properties",
           params: { property: valid_attrs.merge(description: "") },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["description"]).to eq("")
    end

    it "returns property_type as a string in JSON" do
      post "/api/v1/properties", params: { property: valid_attrs }, headers: headers
      expect(response.parsed_body["property_type"]).to eq("apartment")
      expect(response.parsed_body["property_type"]).to be_a(String)
    end

    it "returns JSON with exactly the documented set of keys" do
      post "/api/v1/properties", params: { property: valid_attrs }, headers: headers
      expected_keys = %w[id organization_id name address property_type description created_at updated_at]
      expect(response.parsed_body.keys).to match_array(expected_keys)
    end

    it "ignores organization_id passed in the body" do
      other_org = create(:organization)
      post "/api/v1/properties",
           params: { property: valid_attrs.merge(organization_id: other_org.id) },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["organization_id"]).to eq(organization.id)
      expect(Property.last.organization_id).to eq(organization.id)
    end

    it "returns 422 when name is blank" do
      post "/api/v1/properties",
           params: { property: valid_attrs.merge(name: "") },
           headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("Name")
    end

    it "returns 422 when property_type is invalid" do
      post "/api/v1/properties",
           params: { property: valid_attrs.merge(property_type: "villa") },
           headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 400 when 'property' key is missing from body" do
      post "/api/v1/properties", params: { something_else: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "PATCH /api/v1/properties/:id" do
    let(:property) { create(:property, organization: organization, name: "Old") }

    it "updates allowed attributes and returns 200" do
      patch "/api/v1/properties/#{property.id}",
            params: { property: { name: "New" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("New")
      expect(property.reload.name).to eq("New")
    end

    it "ignores organization_id passed in the body" do
      other_org = create(:organization)
      patch "/api/v1/properties/#{property.id}",
            params: { property: { organization_id: other_org.id } },
            headers: headers
      expect(response).to have_http_status(:ok)
      expect(property.reload.organization_id).to eq(organization.id)
    end

    it "returns 422 when name is set to blank" do
      patch "/api/v1/properties/#{property.id}",
            params: { property: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(property.reload.name).to eq("Old")
    end

    it "returns 404 for a non-existing id" do
      patch "/api/v1/properties/999999",
            params: { property: { name: "X" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /api/v1/properties/:id" do
    it "deletes the property and returns 204" do
      property = create(:property, organization: organization)
      expect do
        delete "/api/v1/properties/#{property.id}", headers: headers
      end.to change(Property, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 for a non-existing id" do
      delete "/api/v1/properties/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ---------------------------------------------------------------------------
  # AC2 — Organization isolation
  # ---------------------------------------------------------------------------
  context "with another organization's property" do
    let(:other_org) { create(:organization) }
    let!(:other_property) { create(:property, organization: other_org, name: "Other") }

    it "is not visible in index" do
      create(:property, organization: organization, name: "Mine")
      get "/api/v1/properties", headers: headers
      names = response.parsed_body.map { |p| p["name"] }
      expect(names).to include("Mine")
      expect(names).not_to include("Other")
    end

    it "show returns 404" do
      get "/api/v1/properties/#{other_property.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "update returns 404" do
      patch "/api/v1/properties/#{other_property.id}",
            params: { property: { name: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
      expect(other_property.reload.name).to eq("Other")
    end

    it "destroy returns 404" do
      expect do
        delete "/api/v1/properties/#{other_property.id}", headers: headers
      end.not_to change(Property, :count)
      expect(response).to have_http_status(:not_found)
    end
  end

  # ---------------------------------------------------------------------------
  # AC3 — Read-only viewer (properties.view only)
  # ---------------------------------------------------------------------------
  context "as a viewer (properties.view only)" do
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
    let(:property) { create(:property, organization: organization) }

    it "allows index" do
      get "/api/v1/properties", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "allows show" do
      get "/api/v1/properties/#{property.id}", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "forbids create with 403" do
      post "/api/v1/properties",
           params: { property: { name: "X", address: "Y", property_type: "apartment" } },
           headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids update with 403" do
      patch "/api/v1/properties/#{property.id}",
            params: { property: { name: "X" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids destroy with 403" do
      patch_target = property
      delete "/api/v1/properties/#{patch_target.id}", headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # AC4 — Member without any property permissions
  # ---------------------------------------------------------------------------
  context "as a member without any property permissions" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "forbids index with 403" do
      get "/api/v1/properties", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids show with 403" do
      property = create(:property, organization: organization)
      get "/api/v1/properties/#{property.id}", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids create with 403" do
      post "/api/v1/properties",
           params: { property: { name: "X", address: "Y", property_type: "apartment" } },
           headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
