require "rails_helper"

RSpec.describe "Api::V1::Branches" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) do
    create(:membership, :owner, user: user, organization: organization)
  end
  let(:headers) { auth_headers(user, organization) }

  describe "without auth token" do
    it "returns 401 for index" do
      get "/api/v1/branches"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for show" do
      b = create(:branch, organization: organization)
      get "/api/v1/branches/#{b.id}"
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for create" do
      post "/api/v1/branches", params: { branch: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for update" do
      b = create(:branch, organization: organization)
      patch "/api/v1/branches/#{b.id}", params: { branch: { name: "X" } }
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 401 for destroy" do
      b = create(:branch, organization: organization)
      delete "/api/v1/branches/#{b.id}"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "without X-Organization-Id header" do
    it "returns 422 with 'Organization not selected' on GET index" do
      token = JsonWebToken.encode(user.id)
      get "/api/v1/branches", headers: { "Authorization" => "Bearer #{token}" }
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body).to eq("error" => "Organization not selected")
    end
  end

  describe "GET /api/v1/branches" do
    it "returns [] for empty organization" do
      get "/api/v1/branches", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq([])
    end

    it "returns branches sorted by id" do
      b1 = create(:branch, organization: organization, name: "Alpha")
      b2 = create(:branch, organization: organization, name: "Beta")
      get "/api/v1/branches", headers: headers
      ids = response.parsed_body.map { |b| b["id"] }
      expect(ids).to eq([ b1.id, b2.id ])
    end

    it "does NOT emit N+1 queries (single SELECT FROM branches)" do
      root = create(:branch, organization: organization, name: "Root")
      child1 = create(:branch, organization: organization, parent_branch: root, name: "C1")
      create(:branch, organization: organization, parent_branch: child1, name: "GC1")
      5.times { |i| create(:branch, organization: organization, name: "R#{i}") }

      branches_queries = 0
      callback = lambda do |*, payload|
        branches_queries += 1 if payload[:sql].include?('FROM "branches"')
      end
      ActiveSupport::Notifications.subscribed(callback, "sql.active_record") do
        get "/api/v1/branches", headers: headers
      end
      expect(branches_queries).to eq(1)
    end
  end

  describe "GET /api/v1/branches/:id" do
    it "returns branch as JSON with exactly the documented keys" do
      root = create(:branch, organization: organization, name: "HQ")
      get "/api/v1/branches/#{root.id}", headers: headers
      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body["id"]).to eq(root.id)
      expect(body["name"]).to eq("HQ")
      expect(body["parent_branch_id"]).to be_nil
      expect(body["organization_id"]).to eq(organization.id)
      expected_keys = %w[id organization_id parent_branch_id name created_at updated_at]
      expect(body.keys).to match_array(expected_keys)
    end

    it "returns parent_branch_id as integer for child" do
      parent = create(:branch, organization: organization)
      child = create(:branch, organization: organization, parent_branch: parent)
      get "/api/v1/branches/#{child.id}", headers: headers
      expect(response.parsed_body["parent_branch_id"]).to eq(parent.id)
    end

    it "returns 404 for non-existing id" do
      get "/api/v1/branches/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/v1/branches" do
    it "creates root branch and returns 201" do
      expect do
        post "/api/v1/branches", params: { branch: { name: "HQ" } }, headers: headers
      end.to change(Branch, :count).by(1)
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("HQ")
      expect(response.parsed_body["parent_branch_id"]).to be_nil
    end

    it "creates child branch with parent_branch_id" do
      parent = create(:branch, organization: organization, name: "Parent")
      post "/api/v1/branches",
           params: { branch: { name: "Child", parent_branch_id: parent.id } },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["parent_branch_id"]).to eq(parent.id)
    end

    it "trims whitespace in name" do
      post "/api/v1/branches",
           params: { branch: { name: "  HQ  " } }, headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["name"]).to eq("HQ")
    end

    it "ignores organization_id in body" do
      other_org = create(:organization)
      post "/api/v1/branches",
           params: { branch: { name: "HQ", organization_id: other_org.id } },
           headers: headers
      expect(response).to have_http_status(:created)
      expect(response.parsed_body["organization_id"]).to eq(organization.id)
    end

    it "returns 422 when name is blank" do
      post "/api/v1/branches",
           params: { branch: { name: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 422 when name is too long (>100)" do
      post "/api/v1/branches",
           params: { branch: { name: "x" * 101 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "returns 400 when 'branch' key is missing" do
      post "/api/v1/branches", params: { something_else: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 422 for non-existing parent_branch_id" do
      post "/api/v1/branches",
           params: { branch: { name: "X", parent_branch_id: 999_999 } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("Parent branch")
    end
  end

  describe "uniqueness AC7a-d" do
    it "AC7a — rejects duplicate case-insensitive name under same parent" do
      parent = create(:branch, organization: organization, name: "HQ")
      create(:branch, organization: organization, parent_branch: parent, name: "Центр")
      post "/api/v1/branches",
           params: { branch: { name: "центр", parent_branch_id: parent.id } },
           headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "AC7b — allows same name under different parents" do
      p1 = create(:branch, organization: organization, name: "HQ")
      p2 = create(:branch, organization: organization, name: "Moscow")
      create(:branch, organization: organization, parent_branch: p1, name: "Центр")
      post "/api/v1/branches",
           params: { branch: { name: "Центр", parent_branch_id: p2.id } },
           headers: headers
      expect(response).to have_http_status(:created)
    end

    it "AC7c — rejects two roots with same name in same org" do
      create(:branch, organization: organization, name: "HQ")
      post "/api/v1/branches",
           params: { branch: { name: "HQ" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it "AC7d — allows same root name in different orgs" do
      other_org = create(:organization)
      create(:branch, organization: other_org, name: "HQ")
      post "/api/v1/branches",
           params: { branch: { name: "HQ" } }, headers: headers
      expect(response).to have_http_status(:created)
    end
  end

  describe "PATCH /api/v1/branches/:id" do
    let!(:root) { create(:branch, organization: organization, name: "Root") }
    let!(:moscow) { create(:branch, organization: organization, parent_branch: root, name: "Moscow") }
    let!(:tverskaya) { create(:branch, organization: organization, parent_branch: moscow, name: "Tverskaya") }

    it "AC1b — updates name without touching parent when parent_branch_id key absent" do
      patch "/api/v1/branches/#{moscow.id}",
            params: { branch: { name: "Moscow2" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(moscow.reload.name).to eq("Moscow2")
      expect(moscow.parent_branch_id).to eq(root.id)
    end

    it "AC2a — moves Tverskaya up to be a child of Root directly" do
      patch "/api/v1/branches/#{tverskaya.id}",
            params: { branch: { parent_branch_id: root.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(tverskaya.reload.parent_branch_id).to eq(root.id)
    end

    it "AC2b — moves Tverskaya back under Moscow" do
      tverskaya.update!(parent_branch: root)
      patch "/api/v1/branches/#{tverskaya.id}",
            params: { branch: { parent_branch_id: moscow.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(tverskaya.reload.parent_branch_id).to eq(moscow.id)
    end

    it "AC2c — root → child (move root A under root C)" do
      a = create(:branch, organization: organization, name: "A")
      c = create(:branch, organization: organization, name: "C")
      patch "/api/v1/branches/#{a.id}",
            params: { branch: { parent_branch_id: c.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(a.reload.parent_branch_id).to eq(c.id)
    end

    it "AC2d — child → root via parent_branch_id: null" do
      patch "/api/v1/branches/#{moscow.id}",
            params: { branch: { parent_branch_id: nil } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(moscow.reload.parent_branch_id).to be_nil
    end

    it "AC2e — atomic update of name and parent_branch_id" do
      p1 = create(:branch, organization: organization, name: "P1")
      p2 = create(:branch, organization: organization, name: "P2")
      x = create(:branch, organization: organization, parent_branch: p1, name: "Old")
      patch "/api/v1/branches/#{x.id}",
            params: { branch: { name: "New", parent_branch_id: p2.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      x.reload
      expect(x.name).to eq("New")
      expect(x.parent_branch_id).to eq(p2.id)
    end

    it "AC3 — rejects parent_branch_id == self.id with 422" do
      patch "/api/v1/branches/#{moscow.id}",
            params: { branch: { parent_branch_id: moscow.id } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("self")
      expect(moscow.reload.parent_branch_id).to eq(root.id)
    end

    it "AC4 — rejects cycle (parent is descendant) with 422" do
      patch "/api/v1/branches/#{root.id}",
            params: { branch: { parent_branch_id: tverskaya.id } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("descendant")
      expect(root.reload.parent_branch_id).to be_nil
    end

    it "ignores organization_id in body" do
      other_org = create(:organization)
      patch "/api/v1/branches/#{moscow.id}",
            params: { branch: { organization_id: other_org.id } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(moscow.reload.organization_id).to eq(organization.id)
    end

    it "returns 400 on empty wrapper {branch: {}}" do
      patch "/api/v1/branches/#{moscow.id}",
            params: { branch: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 400 on missing 'branch' key" do
      patch "/api/v1/branches/#{moscow.id}",
            params: { other: {} }, headers: headers
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "DELETE /api/v1/branches/:id" do
    it "AC1 — deletes leaf branch → 204" do
      leaf = create(:branch, organization: organization)
      expect do
        delete "/api/v1/branches/#{leaf.id}", headers: headers
      end.to change(Branch, :count).by(-1)
      expect(response).to have_http_status(:no_content)
    end

    it "AC6 — returns 409 with exact Spec §5.5 message when children exist" do
      parent = create(:branch, organization: organization)
      create(:branch, organization: organization, parent_branch: parent)
      expect do
        delete "/api/v1/branches/#{parent.id}", headers: headers
      end.not_to change(Branch, :count)
      expect(response).to have_http_status(:conflict)
      expect(response.parsed_body["error"]).to eq([ "Branch has children and cannot be deleted" ])
    end

    it "returns 404 for non-existing id" do
      delete "/api/v1/branches/999999", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  context "AC5 — cross-org isolation (security critical)" do
    let(:other_org) { create(:organization) }
    let!(:foreign) { create(:branch, organization: other_org, name: "Foreign") }
    let!(:mine) { create(:branch, organization: organization, name: "Mine") }

    it "AC5a — POST with foreign parent_branch_id → 422" do
      post "/api/v1/branches",
           params: { branch: { name: "X", parent_branch_id: foreign.id } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["error"].join).to include("Parent branch")
    end

    it "AC5b — PATCH with foreign parent_branch_id → 422, mine not changed" do
      patch "/api/v1/branches/#{mine.id}",
            params: { branch: { parent_branch_id: foreign.id } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
      expect(mine.reload.parent_branch_id).to be_nil
    end

    it "AC5c — GET foreign branch → 404" do
      get "/api/v1/branches/#{foreign.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end

    it "AC5d — PATCH foreign branch → 404, name unchanged" do
      patch "/api/v1/branches/#{foreign.id}",
            params: { branch: { name: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
      expect(foreign.reload.name).to eq("Foreign")
    end

    it "AC5e — DELETE foreign branch → 404, not removed" do
      expect do
        delete "/api/v1/branches/#{foreign.id}", headers: headers
      end.not_to change(Branch, :count)
      expect(response).to have_http_status(:not_found)
    end

    it "is not visible in index" do
      get "/api/v1/branches", headers: headers
      names = response.parsed_body.map { |b| b["name"] }
      expect(names).to include("Mine")
      expect(names).not_to include("Foreign")
    end
  end

  context "AC8 — as a viewer (branches.view only)" do
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
    let!(:branch) { create(:branch, organization: organization) }

    it "allows index" do
      get "/api/v1/branches", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "allows show" do
      get "/api/v1/branches/#{branch.id}", headers: viewer_headers
      expect(response).to have_http_status(:ok)
    end

    it "forbids create with 403" do
      post "/api/v1/branches",
           params: { branch: { name: "X" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids update with 403" do
      patch "/api/v1/branches/#{branch.id}",
            params: { branch: { name: "X" } }, headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids destroy with 403" do
      delete "/api/v1/branches/#{branch.id}", headers: viewer_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "AC9 — as a member without any branch permissions" do
    let(:nopriv_user) { create(:user) }
    let!(:nopriv_membership) do
      create(:membership, user: nopriv_user, organization: organization, role_enum: :member)
    end
    let(:nopriv_headers) { auth_headers(nopriv_user, organization) }
    let!(:branch) { create(:branch, organization: organization) }

    it "forbids index with 403" do
      get "/api/v1/branches", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids show with 403" do
      get "/api/v1/branches/#{branch.id}", headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end

    it "forbids create with 403" do
      post "/api/v1/branches",
           params: { branch: { name: "X" } }, headers: nopriv_headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  context "AC14 — as user with branches.manage but no branches.view" do
    let(:custom_user) { create(:user) }
    let!(:custom_role) do
      organization.roles.create!(code: "branches_manage_only",
                                 name: "Branches manage only",
                                 permissions: %w[branches.manage])
    end
    let!(:custom_membership) do
      create(:membership, user: custom_user, organization: organization,
                          role: custom_role, role_enum: :member)
    end
    let(:custom_headers) { auth_headers(custom_user, organization) }

    it "allows POST (201)" do
      post "/api/v1/branches",
           params: { branch: { name: "X" } }, headers: custom_headers
      expect(response).to have_http_status(:created)
    end

    it "forbids GET show (403)" do
      branch = create(:branch, organization: organization)
      get "/api/v1/branches/#{branch.id}", headers: custom_headers
      expect(response).to have_http_status(:forbidden)
    end
  end
end
