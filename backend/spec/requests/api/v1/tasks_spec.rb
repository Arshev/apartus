require "rails_helper"

RSpec.describe "Api::V1::Tasks" do
  let(:organization) { create(:organization) }
  let(:user) { create(:user) }
  let!(:owner_membership) { create(:membership, :owner, user: user, organization: organization) }
  let(:headers) { auth_headers(user, organization) }

  describe "without auth" do
    it "returns 401" do
      get "/api/v1/tasks"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /api/v1/tasks" do
    it "returns tasks for the organization" do
      create(:task, organization: organization, title: "Clean room")
      get "/api/v1/tasks", headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.length).to eq(1)
      expect(response.parsed_body.first["title"]).to eq("Clean room")
    end

    it "filters by status" do
      create(:task, organization: organization, status: :pending)
      create(:task, organization: organization, status: :completed)
      get "/api/v1/tasks", params: { status: "completed" }, headers: headers
      expect(response.parsed_body.length).to eq(1)
    end
  end

  describe "POST /api/v1/tasks" do
    let(:valid_params) { { task: { title: "Fix AC", priority: "high", category: "maintenance" } } }

    it "creates a task" do
      expect {
        post "/api/v1/tasks", params: valid_params, headers: headers
      }.to change(Task, :count).by(1)
      expect(response).to have_http_status(:created)
    end

    it "returns 422 for missing title" do
      post "/api/v1/tasks", params: { task: { priority: "high" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/v1/tasks/:id" do
    let(:task) { create(:task, organization: organization) }

    it "updates the task" do
      patch "/api/v1/tasks/#{task.id}", params: { task: { status: "completed" } }, headers: headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["status"]).to eq("completed")
    end

    it "returns 422 on invalid update" do
      patch "/api/v1/tasks/#{task.id}", params: { task: { title: "" } }, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/tasks/:id" do
    it "deletes the task" do
      task = create(:task, organization: organization)
      expect {
        delete "/api/v1/tasks/#{task.id}", headers: headers
      }.to change(Task, :count).by(-1)
    end
  end

  context "cross-org isolation" do
    let(:other_org) { create(:organization) }
    let(:other_task) { create(:task, organization: other_org) }

    it "returns 404" do
      patch "/api/v1/tasks/#{other_task.id}", params: { task: { title: "Hacked" } }, headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
