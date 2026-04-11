require "rails_helper"

RSpec.describe NotificationLog do
  describe "validations" do
    it { is_expected.to validate_presence_of(:event_type) }
    it { is_expected.to validate_presence_of(:channel) }
    it { is_expected.to validate_presence_of(:queued_at) }
  end

  describe "associations" do
    it { is_expected.to belong_to(:reservation) }
  end
end
