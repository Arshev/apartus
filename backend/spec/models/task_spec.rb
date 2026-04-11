require "rails_helper"

RSpec.describe Task do
  describe "validations" do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_length_of(:title).is_at_most(255) }
  end

  describe "associations" do
    it { is_expected.to belong_to(:organization) }
    it { is_expected.to belong_to(:property).optional }
    it { is_expected.to belong_to(:unit).optional }
    it { is_expected.to belong_to(:assigned_to).class_name("User").optional }
  end

  describe "enums" do
    it { expect(described_class.statuses).to include("pending" => 0, "in_progress" => 1, "completed" => 2) }
    it { expect(described_class.priorities).to include("low" => 0, "medium" => 1, "high" => 2, "urgent" => 3) }
    it { expect(described_class.categories).to include("cleaning" => 0, "maintenance" => 1, "inspection" => 2, "other" => 3) }
  end
end
