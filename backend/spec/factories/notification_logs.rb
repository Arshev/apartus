FactoryBot.define do
  factory :notification_log do
    reservation
    event_type { "booking_confirmation" }
    channel { "email" }
    recipient_email { "guest@example.com" }
    queued_at { Time.current }
  end
end
