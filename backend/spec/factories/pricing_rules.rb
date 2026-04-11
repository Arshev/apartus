FactoryBot.define do
  factory :pricing_rule do
    unit
    rule_type { :length_discount }
    min_nights { 7 }
    discount_percent { 10 }
    active { true }
  end
end
