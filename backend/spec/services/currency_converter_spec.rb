require "rails_helper"

RSpec.describe CurrencyConverter do
  let(:org_a) { create(:organization, slug: "org-a") }
  let(:org_b) { create(:organization, slug: "org-b") }
  let(:today) { Date.current }

  describe ".convert" do
    context "same currency" do
      it "returns amount_cents unchanged and does not query DB" do
        expect(ExchangeRate).not_to receive(:where)
        result = described_class.convert(amount_cents: 10_000, from: "USD", to: "USD", at: today, organization: org_a)
        expect(result).to eq(10_000)
      end
    end

    context "SC-01 — same decimals (USD->RUB), manual-over-api priority" do
      before do
        create(:exchange_rate, source: "api",
               base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 955_000_000_000, effective_date: today)
        create(:exchange_rate, :manual, organization: org_a,
               base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 1_000_000_000_000, effective_date: today)
      end

      it "uses manual override for org A" do
        expect(described_class.convert(
          amount_cents: 10_000, from: "USD", to: "RUB", at: today, organization: org_a
        )).to eq(1_000_000)
      end

      it "falls back to API rate for org B" do
        expect(described_class.convert(
          amount_cents: 10_000, from: "USD", to: "RUB", at: today, organization: org_b
        )).to eq(955_000)
      end
    end

    context "SC-02 — cross-decimals (USD->UZS, 2->0)" do
      before do
        # USD->UZS = 12700 per USD
        create(:exchange_rate, source: "api",
               base_currency: "USD", quote_currency: "UZS",
               rate_x1e10: 127_000_000_000_000, effective_date: today)
      end

      it "returns correct minor UZS" do
        # 100 USD (10_000 cents) * 12_700 = 1_270_000 UZS (0 decimals → minor == major)
        expect(described_class.convert(
          amount_cents: 10_000, from: "USD", to: "UZS", at: today, organization: org_a
        )).to eq(1_270_000)
      end

      it "round-trips UZS->USD->UZS within 1 minor unit (MET-03)" do
        start_uzs = 1_270_000
        usd = described_class.convert(amount_cents: start_uzs, from: "UZS", to: "USD", at: today, organization: org_a)
        round = described_class.convert(amount_cents: usd, from: "USD", to: "UZS", at: today, organization: org_a)
        expect((round - start_uzs).abs).to be <= 1
      end
    end

    context "SC-03 — triangulation RUB->EUR via USD" do
      before do
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 955_000_000_000, effective_date: today)
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "EUR",
               rate_x1e10: 9_200_000_000, effective_date: today) # 0.92 EUR/USD
      end

      it "computes via USD base" do
        # 100 RUB (10_000 cents) -> EUR.
        # 1 RUB = 1/95.50 USD ≈ 0.01047 USD → 100 RUB ≈ 1.0471 USD
        # * 0.92 EUR/USD = 0.9633 EUR → ~96 cents
        result = described_class.convert(
          amount_cents: 10_000, from: "RUB", to: "EUR", at: today, organization: org_a
        )
        expect(result).to be_within(1).of(96)
      end
    end

    context "fallback by effective_date" do
      before do
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 900_000_000_000, effective_date: today - 3)
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 955_000_000_000, effective_date: today - 1)
      end

      it "picks the most recent rate with effective_date <= at" do
        expect(described_class.convert(
          amount_cents: 10_000, from: "USD", to: "RUB", at: today - 2, organization: org_a
        )).to eq(900_000)

        expect(described_class.convert(
          amount_cents: 10_000, from: "USD", to: "RUB", at: today, organization: org_a
        )).to eq(955_000)
      end
    end

    context "inverse rate (X->USD via stored USD->X)" do
      before do
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 955_000_000_000, effective_date: today) # 95.5 RUB/USD
      end

      it "computes RUB->USD as 1/USD->RUB" do
        # 955 RUB (95_500 cents) → 10 USD (1_000 cents)
        result = described_class.convert(
          amount_cents: 95_500, from: "RUB", to: "USD", at: today, organization: org_a
        )
        expect(result).to eq(1_000)
      end
    end

    context "precision — no intermediate truncation (Codex P1-1)" do
      before do
        # USD↔UZS — largest scale difference in CurrencyConfig.
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "UZS",
               rate_x1e10: 127_000_000_000_000, effective_date: today) # 12_700 UZS/USD
      end

      it "UZS->USD via inverse returns exact 10 USD for 127_000 UZS (not 9_999)" do
        # Old implementation truncated intermediate rate_x1e10, losing ~7e-7 precision.
        # New implementation defers to a single half_even_div, so round-trip is exact.
        result = described_class.convert(
          amount_cents: 127_000, from: "UZS", to: "USD", at: today, organization: org_a
        )
        expect(result).to eq(1_000) # exactly 10.00 USD
      end
    end

    context "NEG-01 — empty DB" do
      it "raises RateNotFound" do
        expect {
          described_class.convert(amount_cents: 10_000, from: "USD", to: "RUB", at: today, organization: org_a)
        }.to raise_error(CurrencyConverter::RateNotFound, /USD->RUB/)
      end
    end

    context "NEG-02 — triangulation incomplete" do
      before do
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 955_000_000_000, effective_date: today)
      end

      it "raises RateNotFound when USD->EUR missing for triangulation" do
        expect {
          described_class.convert(amount_cents: 10_000, from: "RUB", to: "EUR", at: today, organization: org_a)
        }.to raise_error(CurrencyConverter::RateNotFound)
      end
    end

    context "multi-tenant isolation (EC-04)" do
      before do
        create(:exchange_rate, source: "api", base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 955_000_000_000, effective_date: today)
        create(:exchange_rate, :manual, organization: org_a,
               base_currency: "USD", quote_currency: "RUB",
               rate_x1e10: 1_000_000_000_000, effective_date: today)
      end

      it "org A gets manual, org B gets API, no leak" do
        a = described_class.convert(amount_cents: 10_000, from: "USD", to: "RUB", at: today, organization: org_a)
        b = described_class.convert(amount_cents: 10_000, from: "USD", to: "RUB", at: today, organization: org_b)
        expect(a).to eq(1_000_000)
        expect(b).to eq(955_000)
        expect(a).not_to eq(b)
      end
    end
  end

  describe ".half_even_div" do
    it "rounds half to even" do
      expect(described_class.half_even_div(5, 2)).to eq(2)  # 2.5 -> 2 (even)
      expect(described_class.half_even_div(7, 2)).to eq(4)  # 3.5 -> 4 (even)
      expect(described_class.half_even_div(11, 2)).to eq(6) # 5.5 -> 6 (even)
    end

    it "rounds below half down, above half up" do
      expect(described_class.half_even_div(4, 3)).to eq(1)  # 1.33 -> 1
      expect(described_class.half_even_div(10, 3)).to eq(3) # 3.33 -> 3
      expect(described_class.half_even_div(5, 3)).to eq(2)  # 1.66 -> 2
    end
  end
end
