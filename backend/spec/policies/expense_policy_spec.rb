require "rails_helper"

RSpec.describe ExpensePolicy, type: :policy do
  subject { described_class.new(user, build(:expense)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "finances.view",
                  manage_perm: "finances.manage"
end
