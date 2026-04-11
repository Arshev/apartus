require "rails_helper"

RSpec.describe AmenityPolicy, type: :policy do
  subject { described_class.new(user, build(:amenity)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "amenities.view",
                  manage_perm: "amenities.manage"
end
