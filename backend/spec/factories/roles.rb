FactoryBot.define do
  factory :role do
    organization
    name { "Custom Role" }
    sequence(:code) { |n| "custom_#{n}" }
    permissions { %w[properties.view units.view] }
    is_system { false }
  end
end
