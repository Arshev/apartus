require "rails_helper"

RSpec.describe PhotoPolicy, type: :policy do
  subject { described_class.new(user, :photo) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "properties.view",
                  manage_perm: "properties.manage",
                  actions: %i[index create destroy]
end
