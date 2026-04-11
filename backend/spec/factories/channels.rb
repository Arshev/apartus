FactoryBot.define do
  factory :channel do
    unit
    platform { :booking_com }
    ical_import_url { nil }
    sync_enabled { false }
  end
end
