require "rails_helper"

RSpec.describe UnitPolicy, type: :policy do
  subject { described_class.new(user, build(:unit)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "units.view",
                  manage_perm: "units.manage"
end
