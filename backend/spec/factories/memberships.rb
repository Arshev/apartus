FactoryBot.define do
  factory :membership do
    user
    organization
    role_enum { :member }

    trait :owner do
      role_enum { :owner }
    end

    trait :manager do
      role_enum { :manager }
    end
  end
end
