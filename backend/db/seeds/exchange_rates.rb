# Development-only seed for ExchangeRate (FT-037).
# In production, FetchExchangeRatesJob populates these from currencyapi.com
# daily. In dev/test we seed placeholder rates so consumer features (reports,
# statements) have something to convert against without a live API key.

puts "Seeding dev exchange rates..."

today = Date.current

placeholder_rates = {
  "RUB" => 955_000_000_000,      # 95.50 RUB / USD
  "EUR" => 9_200_000_000,        #  0.92 EUR / USD
  "THB" => 354_000_000_000,      # 35.40 THB / USD
  "AED" => 36_700_000_000,       #  3.67 AED / USD
  "TRY" => 341_000_000_000,      # 34.10 TRY / USD
  "KZT" => 4_780_000_000_000,    # 478.0 KZT / USD
  "GEL" => 27_000_000_000,       #  2.70 GEL / USD
  "UZS" => 127_000_000_000_000,  # 12700 UZS / USD
  "GBP" => 7_900_000_000,        #  0.79 GBP / USD
  "IDR" => 158_000_000_000_000   # 15800 IDR / USD
}

placeholder_rates.each do |quote, rate_x1e10|
  ExchangeRate.find_or_create_by!(
    base_currency: "USD",
    quote_currency: quote,
    effective_date: today,
    source: "api",
    organization_id: nil
  ) do |rate|
    rate.rate_x1e10 = rate_x1e10
  end
end

puts "  ✓ Exchange rates: 10 USD→X rows (placeholder, replace via FetchExchangeRatesJob in prod)"
