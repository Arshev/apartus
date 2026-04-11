require "rails_helper"

RSpec.describe BranchPolicy, type: :policy do
  subject { described_class.new(user, build(:branch)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "branches.view",
                  manage_perm: "branches.manage"
end
