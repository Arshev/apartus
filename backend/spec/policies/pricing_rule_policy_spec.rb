require "rails_helper"

RSpec.describe PricingRulePolicy, type: :policy do
  subject { described_class.new(user, :pricing_rule) }

  it_behaves_like "standard CRUD policy",
                  view_perm: "properties.view",
                  manage_perm: "properties.manage",
                  actions: %i[index create update destroy]
end
