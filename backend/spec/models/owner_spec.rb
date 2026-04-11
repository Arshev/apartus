require "rails_helper"

RSpec.describe Owner do
  describe "validations" do
    it { is_expected.to validate_presence_of(:name) }
    it { is_expected.to validate_length_of(:name).is_at_most(255) }
    it { is_expected.to validate_numericality_of(:commission_rate).is_greater_than_or_equal_to(0).is_less_than_or_equal_to(10000).only_integer }
  end

  describe "associations" do
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to have_many(:properties) }
  end
end
