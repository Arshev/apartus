require "rails_helper"

RSpec.describe "Api::V1::Members" do
  let(:organization) { create(:organization) }
  let(:owner) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: owner, organization: organization)
  end
  let(:headers) { auth_headers(owner, organization) }

  describe "GET /api/v1/members" do
    it "returns 401 without auth" do
      get "/api/v1/members"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns memberships of current organization" do
      other_user = create(:user)
      create(:membership, user: other_user, organization: organization, role_enum: :member)
      get "/api/v1/members", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.size).to eq(2)
    end
  end

  describe "POST /api/v1/members" do
    let(:new_member_params) do
      {
        email: "new@example.com",
        password: "Password1!",
        password_confirmation: "Password1!",
        first_name: "New",
        last_name: "User",
        role: "member"
      }
    end

    it "creates membership for a new user as owner" do
      expect do
        post "/api/v1/members", params: new_member_params, headers: headers
      end.to change(Membership, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["user"]["email"]).to eq("new@example.com")
    end

    it "returns 422 for invalid user data" do
      post "/api/v1/members",
           params: new_member_params.merge(email: "not-an-email"), headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "forbids create as member without permissions" do
      member_user = create(:user)
      create(:membership, user: member_user, organization: organization, role_enum: :member)
      member_headers = auth_headers(member_user, organization)
      post "/api/v1/members", params: new_member_params, headers: member_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe "PATCH /api/v1/members/:id" do
    it "updates membership role as owner" do
      other_user = create(:user)
      membership = create(:membership, user: other_user, organization: organization, role_enum: :member)
      patch "/api/v1/members/#{membership.id}",
            params: { role_enum: "manager" }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(membership.reload.role_enum).to eq("manager")
    end
  end

  describe "DELETE /api/v1/members/:id" do
    it "deletes membership as owner" do
      other_user = create(:user)
      membership = create(:membership, user: other_user, organization: organization, role_enum: :member)
      expect do
        delete "/api/v1/members/#{membership.id}", headers: headers
      end.to change(Membership, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end
  end
end
