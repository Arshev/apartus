FactoryBot.define do
  factory :organization do
    name { "Test Organization" }
    sequence(:slug) { |n| "test-org-#{n}" }
  end
end
