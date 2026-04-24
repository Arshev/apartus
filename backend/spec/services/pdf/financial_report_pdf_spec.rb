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
      revenue_by_property: [ { property_name: "Hotel A", revenue: 100_000 } ],
      expenses_by_category: [ { category: "maintenance", total: 30_000 } ]
    }
  end

  describe "#render_pdf" do
    it "returns a valid PDF binary starting with %PDF" do
      pdf = described_class.new(organization, data).render_pdf
      expect(pdf).to be_a(String)
      expect(pdf.bytesize).to be > 100
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "renders without error for empty data arrays" do
      empty_data = data.merge(revenue_by_property: [], expenses_by_category: [])
      pdf = described_class.new(organization, empty_data).render_pdf
      expect(pdf.bytesize).to be > 100
    end

    it "renders with zero-decimal currency (UZS)" do
      org = create(:organization, currency: "UZS")
      pdf = described_class.new(org, data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "renders with symbol-before currency (USD)" do
      org = create(:organization, currency: "USD")
      pdf = described_class.new(org, data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end
  end

  describe "FT-039 — currency override + fallback notice" do
    let(:org_rub) { create(:organization, currency: "RUB") }

    it "renders with data[:currency] override different from org" do
      usd_data = data.merge(currency: "USD")
      pdf = described_class.new(org_rub, usd_data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "renders fallback notice when currency_fallback_reason present" do
      fallback_data = data.merge(currency_fallback_reason: "rate_not_found")
      pdf_with = described_class.new(org_rub, fallback_data).render_pdf
      pdf_without = described_class.new(org_rub, data).render_pdf
      expect(pdf_with.b[0..3]).to eq("%PDF")
      expect(pdf_with.bytesize).to be > pdf_without.bytesize
    end

    it "no override when data[:currency] equals org currency" do
      same_data = data.merge(currency: "RUB")
      pdf = described_class.new(org_rub, same_data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "no override when data[:currency] is nil (default path)" do
      pdf = described_class.new(org_rub, data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end
  end
end
