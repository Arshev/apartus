require "rails_helper"

# Strengthens FT-038 CHK-04 regression: previously only %PDF magic-header
# was asserted, which passed even if `fmt(cents)` output drifted (PDF
# binary is opaque). This spec exercises the private `fmt` directly via
# `send`, locking representative outputs across all CurrencyConfig
# decimals/positions — and verifies the FT-038 currency_override
# keyword is fully backwards-compatible.
RSpec.describe Pdf::BasePdf, type: :service do
  let(:organization) { create(:organization, currency: "RUB") }
  let(:pdf) { described_class.new(organization) }

  describe "#fmt without override (CTR-03 backwards compat)" do
    it "RUB org formats with ruble symbol after, two decimals" do
      expect(pdf.send(:fmt, 5000)).to eq("50.0 ₽")
    end

    it "rounds to currency decimal_places (RUB: 2)" do
      expect(pdf.send(:fmt, 12345)).to eq("123.45 ₽")
    end

    it "handles zero" do
      expect(pdf.send(:fmt, 0)).to eq("0.0 ₽")
    end

    context "USD org (symbol-before, two decimals)" do
      let(:organization) { create(:organization, currency: "USD") }
      it { expect(pdf.send(:fmt, 5000)).to eq("$50.0") }
    end

    context "UZS org (zero-decimal, symbol-after)" do
      let(:organization) { create(:organization, currency: "UZS") }
      it { expect(pdf.send(:fmt, 5000)).to eq("50 сўм") }
    end

    context "IDR org (zero-decimal, symbol-before)" do
      let(:organization) { create(:organization, currency: "IDR") }
      it { expect(pdf.send(:fmt, 100_000)).to eq("Rp1000") }
    end
  end

  describe "#fmt with currency_override (FT-038 / FT-039)" do
    it "USD override on RUB org renders dollar symbol" do
      expect(pdf.send(:fmt, 5000, currency_override: "USD")).to eq("$50.0")
    end

    it "UZS override on RUB org renders sum symbol with 0 decimals" do
      expect(pdf.send(:fmt, 5000, currency_override: "UZS")).to eq("50 сўм")
    end

    it "RUB override on RUB org matches default (no-op)" do
      with    = pdf.send(:fmt, 5000, currency_override: "RUB")
      without = pdf.send(:fmt, 5000)
      expect(with).to eq(without)
    end

    it "nil override falls back to org currency (default behaviour)" do
      expect(pdf.send(:fmt, 5000, currency_override: nil)).to eq(pdf.send(:fmt, 5000))
    end
  end

  describe "#FALLBACK_NOTICE constant (FT-039 pullup)" do
    it "is defined on BasePdf and shared with descendants" do
      expect(Pdf::BasePdf::FALLBACK_NOTICE).to be_a(String)
      expect(Pdf::BasePdf::FALLBACK_NOTICE).to include("Конвертация недоступна")
    end

    it "is reused by FinancialReportPdf and OwnerStatementPdf (no local override)" do
      expect(Pdf::FinancialReportPdf.const_defined?(:FALLBACK_NOTICE, false)).to be(false)
      expect(Pdf::OwnerStatementPdf.const_defined?(:FALLBACK_NOTICE, false)).to be(false)
    end
  end
end
