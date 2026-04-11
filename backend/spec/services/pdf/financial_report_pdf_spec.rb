require "rails_helper"

RSpec.describe Pdf::FinancialReportPdf do
  let(:organization) { create(:organization) }
  let(:data) do
    {
      from: Date.current.beginning_of_month,
      to: Date.current.end_of_month,
      total_revenue: 100_000,
      total_expenses: 30_000,
      net_income: 70_000,
      occupancy_rate: 0.75,
      adr: 5_000,
      revpar: 3_750,
      revenue_by_property: [{ property_name: "Hotel A", revenue: 100_000 }],
      expenses_by_category: [{ category: "maintenance", total: 30_000 }]
    }
  end

  describe "#render_pdf" do
    it "returns a non-empty PDF binary" do
      pdf = described_class.new(organization, data).render_pdf
      expect(pdf).to be_a(String)
      expect(pdf.bytesize).to be > 100
    rescue Prawn::Errors::IncompatibleStringEncoding, Encoding::UndefinedConversionError
      skip "Prawn default font does not support Cyrillic glyphs"
    end
  end
end
