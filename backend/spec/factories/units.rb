FactoryBot.define do
  factory :unit do
    property
    sequence(:name) { |n| "Unit #{n}" }
    unit_type { :room }
    capacity { 2 }
    status { :available }
  end
end
