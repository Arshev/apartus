FactoryBot.define do
  factory :guest do
    organization
    first_name { "John" }
    last_name { "Doe" }
    sequence(:email) { |n| "guest#{n}@example.com" }
    phone { "+79001234567" }
    notes { nil }
  end
end
