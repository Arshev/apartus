require "rails_helper"

RSpec.describe Pdf::OwnerStatementPdf do
  let(:organization) { create(:organization) }
  let(:data) do
    {
      owner_name: "Test Owner",
      from: Date.current.beginning_of_month,
      to: Date.current.end_of_month,
      commission_rate: 1500,
      total_revenue: 100_000,
      total_expenses: 10_000,
      commission: 15_000,
      net_payout: 75_000,
      properties: [
        { property_name: "Hotel A", revenue: 100_000, expenses: 10_000, commission: 15_000, payout: 75_000 }
      ]
    }
  end

  describe "#render_pdf" do
    it "returns a valid PDF binary starting with %PDF" do
      pdf = described_class.new(organization, data).render_pdf
      expect(pdf).to be_a(String)
      expect(pdf.bytesize).to be > 100
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "renders without error for empty properties" do
      empty_data = data.merge(properties: [])
      pdf = described_class.new(organization, empty_data).render_pdf
      expect(pdf.bytesize).to be > 100
    end
  end
end
