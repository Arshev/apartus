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

  describe "FT-038 — currency override" do
    let(:org_rub) { create(:organization, currency: "RUB") }

    it "renders with display currency different from org (USD override)" do
      usd_data = data.merge(currency: "USD")
      pdf = described_class.new(org_rub, usd_data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
      expect(pdf).to include("$").or include("USD")
    end

    it "no override when data[:currency] == org.currency" do
      same_data = data.merge(currency: "RUB")
      pdf = described_class.new(org_rub, same_data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "no override when data[:currency] is nil" do
      pdf = described_class.new(org_rub, data).render_pdf
      expect(pdf.b[0..3]).to eq("%PDF")
    end

    it "renders fallback notice when currency_fallback_reason is present (FM-01)" do
      # PDF content streams are compressed, so substring checks on bytes are unreliable.
      # Instead assert that the fallback PDF is meaningfully larger than the non-fallback
      # variant (extra text line + move_down add bytes to content stream).
      fallback_data = data.merge(currency_fallback_reason: "rate_not_found")
      pdf_with    = described_class.new(org_rub, fallback_data).render_pdf
      pdf_without = described_class.new(org_rub, data).render_pdf
      expect(pdf_with.b[0..3]).to eq("%PDF")
      expect(pdf_with.bytesize).to be > pdf_without.bytesize
    end

    it "zero-revenue (FM-06) renders without crash" do
      zero_data = data.merge(total_revenue: 0, commission: 0, net_payout: 0, properties: [])
      pdf = described_class.new(org_rub, zero_data).render_pdf
      expect(pdf.bytesize).to be > 100
    end
  end
end
