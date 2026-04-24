module CurrencyApiStub
  API_URL = "https://api.currencyapi.com/v3/latest".freeze

  def stub_currencyapi_success(rates: default_rates, base: "USD")
    body = { data: rates.transform_values { |v| { value: v } } }.to_json
    WebMock.stub_request(:get, /#{Regexp.escape(API_URL)}/)
      .with(query: hash_including(base_currency: base))
      .to_return(status: 200, body: body, headers: { "Content-Type" => "application/json" })
  end

  def stub_currencyapi_unauthorized
    WebMock.stub_request(:get, /#{Regexp.escape(API_URL)}/).to_return(status: 401, body: "Unauthorized")
  end

  def stub_currencyapi_partial(rates: { "RUB" => 95.5 })
    body = { data: rates.transform_values { |v| { value: v } } }.to_json
    WebMock.stub_request(:get, /#{Regexp.escape(API_URL)}/)
      .to_return(status: 200, body: body, headers: { "Content-Type" => "application/json" })
  end

  def stub_currencyapi_server_error
    WebMock.stub_request(:get, /#{Regexp.escape(API_URL)}/).to_return(status: 502)
  end

  def default_rates
    {
      "RUB" => 95.5,
      "EUR" => 0.92,
      "THB" => 35.4,
      "AED" => 3.67,
      "TRY" => 34.1,
      "KZT" => 478.0,
      "GEL" => 2.7,
      "UZS" => 12700.0,
      "GBP" => 0.79,
      "IDR" => 15800.0
    }
  end
end

RSpec.configure do |config|
  config.include CurrencyApiStub
  config.before(:each) do
    WebMock.reset!
    WebMock.enable!
    WebMock.disable_net_connect!(allow_localhost: true)
  end
end
