require "rails_helper"

RSpec.describe "Api::V1::UnitAmenities" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }
  let(:property) { create(:property, organization: organization) }
  let(:unit) { create(:unit, property: property) }
  let(:amenity) { create(:amenity, organization: organization) }

  describe "without auth token" do
    it "returns 401 for index" do
      get "/api/v1/units/#{unit.id}/amenities"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for create" do
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: { amenity_id: amenity.id } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for destroy" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      delete "/api/v1/units/#{unit.id}/amenities/#{amenity.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "without X-Organization-Id header" do
    it "returns 422 on GET index" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/units/#{unit.id}/amenities",
          headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq("error" => "Organization not selected")
    end
  end

  describe "GET /api/v1/units/:unit_id/amenities" do
    it "returns [] for unit with no amenities" do
      get "/api/v1/units/#{unit.id}/amenities", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns attached amenities sorted by amenity.id" do
      a1 = create(:amenity, organization: organization, name: "Alpha")
      a2 = create(:amenity, organization: organization, name: "Beta")
      UnitAmenity.create!(unit: unit, amenity: a2)
      UnitAmenity.create!(unit: unit, amenity: a1)
      get "/api/v1/units/#{unit.id}/amenities", headers: headers
      ids = response.parsed_body.map { |a| a["id"] }
      expect(ids).to eq([ a1.id, a2.id ])
    end

    it "returns 404 for non-existing :unit_id" do
      get "/api/v1/units/999999/amenities", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for unit of another organization" do
      other_org = create(:organization)
      other_property = create(:property, organization: other_org)
      other_unit = create(:unit, property: other_property)
      get "/api/v1/units/#{other_unit.id}/amenities", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/units/:unit_id/amenities" do
    it "attaches amenity and returns 201 with UnitAmenity JSON" do
      expect do
        post "/api/v1/units/#{unit.id}/amenities",
             params: { unit_amenity: { amenity_id: amenity.id } }, headers: headers
      end.to change(UnitAmenity, :count).by(1)
      expect(response).to have_http_status(:created)
      body = response.parsed_body
      expect(body["unit_id"]).to eq(unit.id)
      expect(body["amenity_id"]).to eq(amenity.id)
      expected_keys = %w[id unit_id amenity_id created_at updated_at]
      expect(body.keys).to match_array(expected_keys)
    end

    it "returns 400 when 'unit_amenity' key is missing" do
      post "/api/v1/units/#{unit.id}/amenities",
           params: { something_else: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 400 when 'unit_amenity' is an empty hash" do
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 404 when 'unit_amenity' has no amenity_id field (E22b)" do
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: { ignored: "x" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for non-existing :unit_id" do
      post "/api/v1/units/999999/amenities",
           params: { unit_amenity: { amenity_id: amenity.id } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for :unit_id of another organization" do
      other_org = create(:organization)
      other_property = create(:property, organization: other_org)
      other_unit = create(:unit, property: other_property)
      post "/api/v1/units/#{other_unit.id}/amenities",
           params: { unit_amenity: { amenity_id: amenity.id } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for non-existing amenity_id in body" do
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: { amenity_id: 999999 } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 for amenity_id of another organization" do
      other_org = create(:organization)
      other_amenity = create(:amenity, organization: other_org)
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: { amenity_id: other_amenity.id } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 422 on duplicate attachment with exact Spec §5.6 message" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: { amenity_id: amenity.id } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"]).to eq([ "Amenity has already been attached" ])
    end
  end

  describe "DELETE /api/v1/units/:unit_id/amenities/:id" do
    it "detaches amenity and returns 204" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      expect do
        delete "/api/v1/units/#{unit.id}/amenities/#{amenity.id}", headers: headers
      end.to change(UnitAmenity, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "returns 404 for non-existing :unit_id" do
      delete "/api/v1/units/999999/amenities/#{amenity.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 when amenity exists but not attached" do
      delete "/api/v1/units/#{unit.id}/amenities/#{amenity.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 when :id does not exist" do
      delete "/api/v1/units/#{unit.id}/amenities/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 when :id is amenity of another org" do
      other_org = create(:organization)
      other_amenity = create(:amenity, organization: other_org)
      delete "/api/v1/units/#{unit.id}/amenities/#{other_amenity.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  context "as a viewer (AC7)" do
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
    let!(:attachment) { UnitAmenity.create!(unit: unit, amenity: amenity) }

    it "allows GET index" do
      get "/api/v1/units/#{unit.id}/amenities", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "forbids POST with 403" do
      other_amenity = create(:amenity, organization: organization)
      post "/api/v1/units/#{unit.id}/amenities",
           params: { unit_amenity: { amenity_id: other_amenity.id } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids DELETE with 403" do
      delete "/api/v1/units/#{unit.id}/amenities/#{amenity.id}", headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a member with no unit/amenity permissions (AC8)" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }

    it "forbids GET index with 403" do
      get "/api/v1/units/#{unit.id}/amenities", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a user with units.manage+view but no amenities.view (AC8 case 1)" do
    let(:custom_user) { create(:user) }
    let!(:custom_role) do
      organization.roles.create!(code: "units_only", name: "Units only",
                                 permissions: %w[units.view units.manage])
    end
    let!(:custom_membership) do
      create(:membership, user: custom_user, organization: organization,
                          role: custom_role, role_enum: :member)
    end
    let(:custom_headers) { auth_headers(custom_user, organization) }

    it "forbids GET index with 403" do
      get "/api/v1/units/#{unit.id}/amenities", headers: custom_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a user with only units.view (no manage, no amenities.view) — V3/E26" do
    let(:custom_user) { create(:user) }
    let!(:custom_role) do
      organization.roles.create!(code: "units_view_only", name: "Units view only",
                                 permissions: %w[units.view])
    end
    let!(:custom_membership) do
      create(:membership, user: custom_user, organization: organization,
                          role: custom_role, role_enum: :member)
    end
    let(:custom_headers) { auth_headers(custom_user, organization) }

    it "returns 403 on GET index" do
      get "/api/v1/units/#{unit.id}/amenities", headers: custom_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "as a user with amenities.view but no units.view/manage (AC8 case 2)" do
    let(:custom_user) { create(:user) }
    let!(:custom_role) do
      organization.roles.create!(code: "amenities_view_only", name: "Amenities view only",
                                 permissions: %w[amenities.view])
    end
    let!(:custom_membership) do
      create(:membership, user: custom_user, organization: organization,
                          role: custom_role, role_enum: :member)
    end
    let(:custom_headers) { auth_headers(custom_user, organization) }

    it "returns 403 on GET index" do
      get "/api/v1/units/#{unit.id}/amenities", headers: custom_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "AC17 — no-perm user + foreign :unit_id collision" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }
    let(:other_org) { create(:organization) }
    let(:foreign_property) { create(:property, organization: other_org) }
    let(:foreign_unit) { create(:unit, property: foreign_property) }

    it "POST returns 404 (not 403) per Spec §4.7 ordering" do
      post "/api/v1/units/#{foreign_unit.id}/amenities",
           params: { unit_amenity: { amenity_id: 1 } }, headers: nopriv_headers
      expect(response).to have_http_status(:not_found)
    end
  end

  context "AC14 — F2 Unit JSON unchanged" do
    it "GET /properties/:pid/units/:uid does not include 'amenities' key after attach" do
      UnitAmenity.create!(unit: unit, amenity: amenity)
      other_amenity = create(:amenity, organization: organization)
      UnitAmenity.create!(unit: unit, amenity: other_amenity)

      get "/api/v1/properties/#{property.id}/units/#{unit.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).not_to have_key("amenities")
      expected_keys = %w[id property_id name unit_type capacity status created_at updated_at]
      expect(response.parsed_body.keys).to match_array(expected_keys)
    end
  end
end
