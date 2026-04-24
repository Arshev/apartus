class CurrencyConverter
  class RateNotFound < StandardError
    attr_reader :from, :to, :at, :organization_id

    def initialize(from:, to:, at:, organization_id:)
      @from = from
      @to = to
      @at = at
      @organization_id = organization_id
      super("Exchange rate not found: #{from}->#{to} at #{at} (org=#{organization_id || 'global'})")
    end
  end

  RATE_SCALE = 10**10

  def self.convert(amount_cents:, from:, to:, at:, organization:)
    raise ArgumentError, "organization is required" if organization.nil?
    return amount_cents if from == to

    rate_x1e10 = find_rate_x1e10(from: from, to: to, at: at, organization: organization)
    apply(amount_cents: amount_cents, from: from, to: to, rate_x1e10: rate_x1e10)
  end

  def self.find_rate_x1e10(from:, to:, at:, organization:)
    direct = lookup_direct(base: from, quote: to, at: at, organization: organization)
    return direct if direct

    inverse = lookup_inverse(base: from, quote: to, at: at, organization: organization)
    return inverse if inverse

    return triangulate(from: from, to: to, at: at, organization: organization) if from != "USD" && to != "USD"

    raise RateNotFound.new(from: from, to: to, at: at, organization_id: organization&.id)
  end

  def self.lookup_direct(base:, quote:, at:, organization:)
    manual = ExchangeRate.for_organization(organization).by_pair(base, quote).effective_on(at).first
    return manual.rate_x1e10 if manual

    api = ExchangeRate.global.by_pair(base, quote).effective_on(at).first
    api&.rate_x1e10
  end

  def self.lookup_inverse(base:, quote:, at:, organization:)
    # rate(base -> quote) = 1 / rate(quote -> base)
    reverse_rate = lookup_direct(base: quote, quote: base, at: at, organization: organization)
    return nil if reverse_rate.nil?

    # (10**10 * 10**10) / reverse = inverted rate in x1e10 form
    (RATE_SCALE * RATE_SCALE) / reverse_rate
  end

  def self.triangulate(from:, to:, at:, organization:)
    usd_from = find_rate_x1e10(from: "USD", to: from, at: at, organization: organization)
    usd_to   = find_rate_x1e10(from: "USD", to: to,   at: at, organization: organization)
    # from -> to = (1 / (USD->from)) * (USD->to)
    # In x1e10: (RATE_SCALE * usd_to) / usd_from
    (RATE_SCALE * usd_to) / usd_from
  rescue RateNotFound
    raise RateNotFound.new(from: from, to: to, at: at, organization_id: organization&.id)
  end

  def self.apply(amount_cents:, from:, to:, rate_x1e10:)
    source_dec = CurrencyConfig.decimal_places(from)
    target_dec = CurrencyConfig.decimal_places(to)
    diff = target_dec - source_dec

    if diff >= 0
      numerator   = amount_cents * rate_x1e10 * (10**diff)
      denominator = RATE_SCALE
    else
      numerator   = amount_cents * rate_x1e10
      denominator = RATE_SCALE * (10**(-diff))
    end

    half_even_div(numerator, denominator)
  end

  # Integer half-even ("banker's") rounding division.
  def self.half_even_div(numerator, denominator)
    quotient, remainder = numerator.divmod(denominator)
    double_r = 2 * remainder
    return quotient if double_r < denominator
    return quotient + 1 if double_r > denominator
    quotient.even? ? quotient : quotient + 1
  end
end
