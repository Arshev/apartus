FactoryBot.define do
  factory :branch do
    organization
    sequence(:name) { |n| "Branch #{n}" }
  end
end
