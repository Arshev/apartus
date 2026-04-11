require "rails_helper"

RSpec.describe JwtDenylist do
  describe "validations" do
    subject { create(:jwt_denylist) }

    it { is_expected.to validate_presence_of(:jti) }
    it { is_expected.to validate_uniqueness_of(:jti) }
    it { is_expected.to validate_presence_of(:exp) }
  end

  describe "scopes" do
    it ".expired returns tokens with exp in the past" do
      expired = JwtDenylist.create!(jti: SecureRandom.uuid, exp: 1.hour.ago)
      active = JwtDenylist.create!(jti: SecureRandom.uuid, exp: 1.hour.from_now)

      expect(JwtDenylist.expired).to include(expired)
      expect(JwtDenylist.expired).not_to include(active)
    end
  end
end
