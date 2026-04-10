FactoryBot.define do
  factory :reservation do
    unit
    guest { nil }
    check_in { Date.today }
    check_out { Date.today + 3 }
    status { :confirmed }
    guests_count { 2 }
    total_price_cents { 10_000 }
    notes { nil }
  end
end
