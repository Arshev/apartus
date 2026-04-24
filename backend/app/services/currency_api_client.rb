require "net/http"
require "uri"
require "json"

class CurrencyApiClient
  class Error < StandardError; end
  class Unauthorized < Error; end
  class InvalidResponse < Error; end

  BASE_URL = "https://api.currencyapi.com/v3/latest".freeze
  TIMEOUT_SECONDS = 10

  # Returns hash like: { "RUB" => 955_000_000_000, "EUR" => 9_200_000_000, ... }
  # Integer rate_x1e10 values, one HTTP request.
  def self.latest(base:, currencies:, api_key:)
    raise Error, "api_key is blank" if api_key.to_s.strip.empty?

    uri = URI.parse(BASE_URL)
    uri.query = URI.encode_www_form(
      base_currency: base,
      currencies: currencies.join(",")
    )

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.open_timeout = TIMEOUT_SECONDS
    http.read_timeout = TIMEOUT_SECONDS

    request = Net::HTTP::Get.new(uri)
    request["apikey"] = api_key
    request["Accept"] = "application/json"

    response = http.request(request)

    case response
    when Net::HTTPSuccess
      parse(response.body)
    when Net::HTTPUnauthorized
      raise Unauthorized, "currencyapi.com returned 401 (invalid key)"
    else
      raise Error, "currencyapi.com returned #{response.code}: #{response.body.to_s[0, 200]}"
    end
  end

  def self.parse(body)
    data = JSON.parse(body).fetch("data", {})
    data.each_with_object({}) do |(code, payload), acc|
      value = payload.is_a?(Hash) ? payload["value"] : nil
      next if value.nil?
      acc[code] = (value.to_r * 10**10).to_i
    end
  rescue JSON::ParserError => e
    raise InvalidResponse, "malformed JSON: #{e.message}"
  end
end
