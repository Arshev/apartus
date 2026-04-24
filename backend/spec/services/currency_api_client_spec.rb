require "rails_helper"

RSpec.describe CurrencyApiClient do
  let(:api_key) { "test_key_123" }

  describe ".latest" do
    it "returns integer rate_x1e10 hash on success" do
      stub_currencyapi_success(rates: { "RUB" => 95.5, "EUR" => 0.92 })
      rates = described_class.latest(base: "USD", currencies: %w[RUB EUR], api_key: api_key)
      expect(rates).to eq(
        "RUB" => 955_000_000_000,
        "EUR" => 9_200_000_000
      )
    end

    it "raises Unauthorized on 401 (FM-02, NEG-09)" do
      stub_currencyapi_unauthorized
      expect {
        described_class.latest(base: "USD", currencies: %w[RUB], api_key: "bad")
      }.to raise_error(CurrencyApiClient::Unauthorized, /401/)
    end

    it "raises Error on 5xx" do
      stub_currencyapi_server_error
      expect {
        described_class.latest(base: "USD", currencies: %w[RUB], api_key: api_key)
      }.to raise_error(CurrencyApiClient::Error, /502/)
    end

    it "raises Error on blank api_key" do
      expect {
        described_class.latest(base: "USD", currencies: %w[RUB], api_key: " ")
      }.to raise_error(CurrencyApiClient::Error, /api_key is blank/)
    end

    it "handles partial response (FM-03, NEG-10) — returns only present rates" do
      stub_currencyapi_partial(rates: { "RUB" => 95.5 })
      rates = described_class.latest(base: "USD", currencies: %w[RUB EUR THB], api_key: api_key)
      expect(rates).to eq("RUB" => 955_000_000_000)
    end

    it "raises InvalidResponse on malformed JSON" do
      stub_request(:get, /currencyapi/).to_return(status: 200, body: "<html>oops</html>")
      expect {
        described_class.latest(base: "USD", currencies: %w[RUB], api_key: api_key)
      }.to raise_error(CurrencyApiClient::InvalidResponse)
    end

    it "sends apikey header and encoded currencies" do
      stub_currencyapi_success
      described_class.latest(base: "USD", currencies: %w[RUB EUR THB], api_key: api_key)
      expect(
        a_request(:get, /api\.currencyapi\.com/)
          .with(headers: { "Apikey" => api_key })
          .with(query: hash_including(base_currency: "USD", currencies: "RUB,EUR,THB"))
      ).to have_been_made
    end
  end
end
