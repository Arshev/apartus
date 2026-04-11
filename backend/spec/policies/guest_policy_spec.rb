require "rails_helper"

RSpec.describe GuestPolicy, type: :policy do
  subject { described_class.new(user, build(:guest)) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "guests.view",
                  manage_perm: "guests.manage"
end
