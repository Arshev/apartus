FactoryBot.define do
  factory :amenity do
    organization
    sequence(:name) { |n| "Amenity #{n}" }
  end
end
