require "rails_helper"

RSpec.describe TaskPolicy, type: :policy do
  subject { described_class.new(user, build(:task)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "tasks.view",
                  manage_perm: "tasks.manage"
end
