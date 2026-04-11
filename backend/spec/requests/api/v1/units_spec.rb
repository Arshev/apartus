require "rails_helper"

RSpec.describe "Api::V1::Units" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }

  # ---------------------------------------------------------------------------
  # AC7 — Unauthenticated
  # ---------------------------------------------------------------------------
  describe "without auth token" do
    it "returns 401 for index" do
      get "/api/v1/properties/#{property.id}/units"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for show" do
      unit = create(:unit, property: property)
      get "/api/v1/properties/#{property.id}/units/#{unit.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for create" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for update" do
      unit = create(:unit, property: property)
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for destroy" do
      unit = create(:unit, property: property)
      delete "/api/v1/properties/#{property.id}/units/#{unit.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ---------------------------------------------------------------------------
  # AC13 — Missing X-Organization-Id
  # ---------------------------------------------------------------------------
  describe "without X-Organization-Id header" do
    it "returns 422 with 'Organization not selected' on GET index" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/properties/#{property.id}/units",
          headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq("error" => "Organization not selected")
    end
  end

  # ---------------------------------------------------------------------------
  # AC1 — Happy path CRUD as owner
  # ---------------------------------------------------------------------------
  describe "GET /api/v1/properties/:property_id/units" do
    it "returns [] for a property with no units" do
      get "/api/v1/properties/#{property.id}/units", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns units of the property sorted by id" do
      u1 = create(:unit, property: property, name: "Alpha")
      u2 = create(:unit, property: property, name: "Beta")
      get "/api/v1/properties/#{property.id}/units", headers: headers
      expect(response).to have_http_status(:ok)
      ids = response.parsed_body.map { |u| u["id"] }
      expect(ids).to eq([ u1.id, u2.id ])
    end

    it "returns only units of the requested property, not siblings" do
      other_property = create(:property, organization: organization)
      mine = create(:unit, property: property, name: "Mine")
      create(:unit, property: other_property, name: "Other")
      get "/api/v1/properties/#{property.id}/units", headers: headers
      names = response.parsed_body.map { |u| u["name"] }
      expect(names).to eq([ "Mine" ])
      expect(response.parsed_body.first["id"]).to eq(mine.id)
    end
  end

  describe "GET /api/v1/properties/:property_id/units/:id" do
    it "returns the unit as JSON with all keys and string enums" do
      unit = create(:unit, property: property, name: "Room 101",
                           unit_type: :room, capacity: 3, status: :available)
      get "/api/v1/properties/#{property.id}/units/#{unit.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["id"]).to eq(unit.id)
      expect(body["property_id"]).to eq(property.id)
      expect(body["name"]).to eq("Room 101")
      expect(body["unit_type"]).to eq("room")
      expect(body["capacity"]).to eq(3)
      expect(body["status"]).to eq("available")
      expected_keys = %w[id property_id name unit_type capacity status base_price_cents created_at updated_at]
      expect(body.keys).to match_array(expected_keys)
    end

    it "does not include organization_id in JSON" do
      unit = create(:unit, property: property)
      get "/api/v1/properties/#{property.id}/units/#{unit.id}", headers: headers
      expect(response.parsed_body).not_to have_key("organization_id")
    end

    it "returns 404 for a non-existing :id" do
      get "/api/v1/properties/#{property.id}/units/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for a unit of another property in the same org (AC3)" do
      other_property = create(:property, organization: organization)
      foreign_unit = create(:unit, property: other_property)
      get "/api/v1/properties/#{property.id}/units/#{foreign_unit.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/properties/:property_id/units" do
    let(:valid_attrs) do
      { name: "Room 101", unit_type: "room", capacity: 2, status: "available" }
    end

    it "creates a unit and returns 201" do
      expect do
        post "/api/v1/properties/#{property.id}/units",
             params: { unit: valid_attrs }, headers: headers
      end.to change(Unit, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Room 101")
      expect(response.parsed_body["property_id"]).to eq(property.id)
    end

    it "returns unit_type and status as strings" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs }, headers: headers
      expect(response.parsed_body["unit_type"]).to eq("room")
      expect(response.parsed_body["status"]).to eq("available")
      expect(response.parsed_body["unit_type"]).to be_a(String)
      expect(response.parsed_body["status"]).to be_a(String)
    end

    it "ignores property_id passed in the body (AC10, uses URL)" do
      other_property = create(:property, organization: organization)
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(property_id: other_property.id) },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["property_id"]).to eq(property.id)
      expect(Unit.last.property_id).to eq(property.id)
    end

    it "trims leading/trailing whitespace in name (Spec §3.4.4)" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(name: "  Room 101  ") },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("Room 101")
      expect(Unit.last.name).to eq("Room 101")
    end

    it "accepts capacity = 1 (lower boundary)" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(capacity: 1) }, headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["capacity"]).to eq(1)
    end

    it "accepts capacity = 100 (upper boundary)" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(capacity: 100) }, headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["capacity"]).to eq(100)
    end

    it "returns 422 when name is blank" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(name: "") }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("Name")
    end

    it "returns 422 when unit_type is invalid, not 500 (F1 follow-up)" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(unit_type: "villa") },
           headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when status is invalid, not 500 (F1 follow-up)" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(status: "archived") },
           headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when capacity is 0" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(capacity: 0) }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when capacity is 101" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: valid_attrs.merge(capacity: 101) }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 400 when 'unit' key is missing from body" do
      post "/api/v1/properties/#{property.id}/units",
           params: { something_else: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "PATCH /api/v1/properties/:property_id/units/:id" do
    let(:unit) { create(:unit, property: property, name: "Old", capacity: 2) }

    it "updates allowed attributes and returns 200" do
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { name: "New", capacity: 4 } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["name"]).to eq("New")
      expect(unit.reload.name).to eq("New")
      expect(unit.capacity).to eq(4)
    end

    it "ignores property_id passed in the body (AC10, immutable)" do
      other_property = create(:property, organization: organization)
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { property_id: other_property.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(unit.reload.property_id).to eq(property.id)
    end

    it "returns 422 when name is set to blank" do
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(unit.reload.name).to eq("Old")
    end

    it "returns 422 when unit_type is invalid, not 500 (F1 follow-up)" do
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { unit_type: "villa" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when status is invalid, not 500 (F1 follow-up)" do
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { status: "archived" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 404 for a unit of another property in the same org (AC3)" do
      other_property = create(:property, organization: organization)
      foreign_unit = create(:unit, property: other_property)
      patch "/api/v1/properties/#{property.id}/units/#{foreign_unit.id}",
            params: { unit: { name: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
      expect(foreign_unit.reload.name).not_to eq("Hacked")
    end
  end

  describe "DELETE /api/v1/properties/:property_id/units/:id" do
    it "deletes the unit and returns 204" do
      unit = create(:unit, property: property)
      expect do
        delete "/api/v1/properties/#{property.id}/units/#{unit.id}", headers: headers
      end.to change(Unit, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 for a unit of another property in the same org (AC3)" do
      other_property = create(:property, organization: organization)
      foreign_unit = create(:unit, property: other_property)
      expect do
        delete "/api/v1/properties/#{property.id}/units/#{foreign_unit.id}",
               headers: headers
      end.not_to change(Unit, :count)
      expect(response).to have_http_status(:not_found)
    end
  end

  # ---------------------------------------------------------------------------
  # AC2 — Organization isolation (another org's property/unit)
  # ---------------------------------------------------------------------------
  context "with another organization's property/unit" do
    let(:other_org) { create(:organization) }
    let(:other_property) { create(:property, organization: other_org) }
    let!(:other_unit) { create(:unit, property: other_property) }

    it "index through foreign :property_id returns 404" do
      get "/api/v1/properties/#{other_property.id}/units", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "show of foreign unit returns 404" do
      get "/api/v1/properties/#{other_property.id}/units/#{other_unit.id}",
          headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "update of foreign unit returns 404" do
      patch "/api/v1/properties/#{other_property.id}/units/#{other_unit.id}",
            params: { unit: { name: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "destroy of foreign unit returns 404" do
      expect do
        delete "/api/v1/properties/#{other_property.id}/units/#{other_unit.id}",
               headers: headers
      end.not_to change(Unit, :count)
      expect(response).to have_http_status(:not_found)
    end
  end

  # ---------------------------------------------------------------------------
  # AC4 — Non-existing :property_id
  # ---------------------------------------------------------------------------
  describe "non-existing :property_id" do
    it "returns 404 on index" do
      get "/api/v1/properties/999999/units", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 on create" do
      post "/api/v1/properties/999999/units",
           params: { unit: { name: "X", unit_type: "room", capacity: 1, status: "available" } },
           headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 on show" do
      get "/api/v1/properties/999999/units/1", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ---------------------------------------------------------------------------
  # AC5 — Read-only viewer (units.view only)
  # ---------------------------------------------------------------------------
  context "as a viewer (units.view only)" do
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
    let!(:unit) { create(:unit, property: property) }

    it "allows index" do
      get "/api/v1/properties/#{property.id}/units", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "allows show" do
      get "/api/v1/properties/#{property.id}/units/#{unit.id}",
          headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "forbids create with 403" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: { name: "X", unit_type: "room", capacity: 1, status: "available" } },
           headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids update with 403" do
      patch "/api/v1/properties/#{property.id}/units/#{unit.id}",
            params: { unit: { name: "X" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids destroy with 403" do
      delete "/api/v1/properties/#{property.id}/units/#{unit.id}",
             headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # AC6 — Member without any unit permissions
  # ---------------------------------------------------------------------------
  context "as a member without any unit permissions" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }
    let!(:unit) { create(:unit, property: property) }

    it "forbids index with 403" do
      get "/api/v1/properties/#{property.id}/units", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids show with 403" do
      get "/api/v1/properties/#{property.id}/units/#{unit.id}",
          headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids create with 403" do
      post "/api/v1/properties/#{property.id}/units",
           params: { unit: { name: "X", unit_type: "room", capacity: 1, status: "available" } },
           headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # AC4 collision: no-perm user + foreign :property_id → 404 (Spec §4.6)
  # ---------------------------------------------------------------------------
  context "as no-permission user with foreign :property_id" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }
    let(:other_org) { create(:organization) }
    let(:foreign_property) { create(:property, organization: other_org) }

    it "POST returns 404 (not 403) per Spec §4.6 ordering" do
      post "/api/v1/properties/#{foreign_property.id}/units",
           params: { unit: { name: "X", unit_type: "room", capacity: 1, status: "available" } },
           headers: nopriv_headers
      expect(response).to have_http_status(:not_found)
    end

    it "GET index returns 404 (not 403) per Spec §4.6 ordering" do
      get "/api/v1/properties/#{foreign_property.id}/units", headers: nopriv_headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
