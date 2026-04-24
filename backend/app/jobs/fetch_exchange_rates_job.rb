class FetchExchangeRatesJob < ApplicationJob
  queue_as :default

  # FM-01: 3 attempts, 1m / 5m / 25m backoff (quintuple escalation).
  retry_on CurrencyApiClient::Error,
           wait: ->(executions) { [ 60, 300, 1500 ][executions - 1] || 1500 },
           attempts: 3

  # No retry for auth failures — fail fast (FM-02)
  discard_on CurrencyApiClient::Unauthorized do |_job, error|
    Rails.logger.error("[FetchExchangeRatesJob] 401 from currencyapi.com — check api_key. #{error.message}")
  end

  def perform
    api_key = Rails.application.credentials.dig(:currencyapi, :api_key)
    if api_key.blank?
      Rails.logger.warn("[FetchExchangeRatesJob] currencyapi.api_key not configured — skipping daily fetch (FM-10)")
      return
    end

    currencies = CurrencyConfig.codes - [ "USD" ]
    rates = CurrencyApiClient.latest(base: "USD", currencies: currencies, api_key: api_key)

    missing = currencies - rates.keys
    if missing.any?
      Rails.logger.warn("[FetchExchangeRatesJob] partial response — missing rates for #{missing.join(', ')}")
    end

    now = Time.current
    today = Date.current
    rows = rates.map do |quote, rate_x1e10|
      {
        base_currency: "USD",
        quote_currency: quote,
        rate_x1e10: rate_x1e10,
        effective_date: today,
        source: "api",
        organization_id: nil,
        created_at: now,
        updated_at: now
      }
    end

    return if rows.empty?

    ExchangeRate.upsert_all(
      rows,
      unique_by: :idx_exchange_rates_unique_global,
      update_only: [ :rate_x1e10 ]
    )
  end
end
