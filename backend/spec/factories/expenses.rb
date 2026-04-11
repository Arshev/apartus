FactoryBot.define do
  factory :expense do
    organization
    category { :maintenance }
    amount_cents { 5000 }
    expense_date { Date.current }
    description { "Test expense" }
  end
end
