require "rails_helper"

RSpec.describe PropertyPolicy, type: :policy do
  subject { described_class.new(user, build(:property)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "properties.view",
                  manage_perm: "properties.manage"
end
