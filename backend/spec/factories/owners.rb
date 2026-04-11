FactoryBot.define do
  factory :owner do
    organization
    name { "Test Owner" }
    commission_rate { 1500 }
  end
end
