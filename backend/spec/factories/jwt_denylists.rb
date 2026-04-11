FactoryBot.define do
  factory :jwt_denylist do
    sequence(:jti) { |n| SecureRandom.uuid }
    exp { 1.hour.from_now }
  end
end
