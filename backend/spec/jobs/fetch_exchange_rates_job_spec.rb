require "rails_helper"

RSpec.describe FetchExchangeRatesJob do
  let(:api_key) { "test_api_key_abc" }

  before do
    allow(Rails.application.credentials).to receive(:dig).with(:currencyapi, :api_key).and_return(api_key)
  end

  describe "#perform" do
    context "SC-04 — idempotency + exact 1 HTTP request per run" do
      it "creates 10 rows on first run and 0 new rows on second run" do
        stub_currencyapi_success

        expect { described_class.perform_now }.to change { ExchangeRate.count }.by(10)
        expect(a_request(:get, /api\.currencyapi\.com/)).to have_been_made.once

        expect { described_class.perform_now }.not_to change { ExchangeRate.count }
        expect(a_request(:get, /api\.currencyapi\.com/)).to have_been_made.twice
      end

      it "updates rate_x1e10 via upsert on repeated run with changed rates" do
        stub_currencyapi_success(rates: { "RUB" => 90.0 })
        described_class.perform_now
        original = ExchangeRate.find_by(base_currency: "USD", quote_currency: "RUB")
        expect(original.rate_x1e10).to eq(900_000_000_000)

        WebMock.reset!
        stub_currencyapi_success(rates: { "RUB" => 95.0 })
        described_class.perform_now

        updated = ExchangeRate.find_by(base_currency: "USD", quote_currency: "RUB")
        expect(updated.id).to eq(original.id)
        expect(updated.rate_x1e10).to eq(950_000_000_000)
      end
    end

    context "SC-06 — api key missing" do
      before do
        allow(Rails.application.credentials).to receive(:dig).with(:currencyapi, :api_key).and_return(nil)
      end

      it "early-returns without HTTP call" do
        described_class.perform_now
        expect(a_request(:get, /currencyapi/)).not_to have_been_made
        expect(ExchangeRate.count).to eq(0)
      end
    end

    context "NEG-09 — 401 invalid key (FM-02)" do
      it "discards job without retrying" do
        stub_currencyapi_unauthorized
        expect { described_class.perform_now }.not_to raise_error
        expect(ExchangeRate.count).to eq(0)
      end
    end

    context "NEG-10 — partial response (FM-03)" do
      it "upserts only present currencies" do
        stub_currencyapi_partial(rates: { "RUB" => 95.5, "EUR" => 0.92 })
        expect { described_class.perform_now }.to change { ExchangeRate.count }.by(2)
        expect(ExchangeRate.pluck(:quote_currency)).to match_array(%w[RUB EUR])
      end
    end

    context "malformed JSON (Claude P2-01)" do
      it "discards job without retry and without upsert" do
        WebMock.stub_request(:get, /api\.currencyapi\.com/).to_return(status: 200, body: "<html>oops</html>")
        expect { described_class.perform_now }.not_to raise_error
        expect(ExchangeRate.count).to eq(0)
      end
    end
  end
end
