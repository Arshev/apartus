FactoryBot.define do
  factory :seasonal_price do
    unit
    start_date { Date.today }
    end_date { Date.today + 30 }
    price_cents { 5_000 }
  end
end
