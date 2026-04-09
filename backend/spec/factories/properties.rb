FactoryBot.define do
  factory :property do
    organization
    sequence(:name) { |n| "Property #{n}" }
    address { "1 Test Street" }
    property_type { :apartment }
    description { "Test description" }
  end
end
