FactoryBot.define do
  factory :exchange_rate do
    base_currency { "USD" }
    quote_currency { "RUB" }
    rate_x1e10 { 955_000_000_000 } # 95.5 RUB per USD
    effective_date { Date.current }
    source { "api" }
    organization_id { nil }

    trait :manual do
      source { "manual" }
      organization
      rate_x1e10 { 1_000_000_000_000 } # 100.0 RUB per USD
    end

    trait :for_pair do
      transient do
        base { "USD" }
        quote { "RUB" }
      end
      base_currency { base }
      quote_currency { quote }
    end
  end
end
