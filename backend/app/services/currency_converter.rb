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

  # Priority: direct > inverse (reverse pair) > triangulate via USD.
  # Rate is never materialized as an intermediate truncated integer;
  # all division is deferred to a single final half_even_div to avoid
  # precision loss for high-scale-difference pairs (USD↔UZS, USD↔IDR).
  def self.convert(amount_cents:, from:, to:, at:, organization:)
    raise ArgumentError, "organization is required" if organization.nil?
    return amount_cents if from == to

    scale_up   = 10**[ CurrencyConfig.decimal_places(to) - CurrencyConfig.decimal_places(from), 0 ].max
    scale_down = 10**[ CurrencyConfig.decimal_places(from) - CurrencyConfig.decimal_places(to), 0 ].max

    # Direct: rate = stored / RATE_SCALE
    if (direct = lookup_direct(base: from, quote: to, at: at, organization: organization))
      return half_even_div(
        amount_cents * direct * scale_up,
        RATE_SCALE * scale_down
      )
    end

    # Inverse: have quote→base stored; rate(base→quote) = RATE_SCALE / reverse
    if (reverse = lookup_direct(base: to, quote: from, at: at, organization: organization))
      return half_even_div(
        amount_cents * RATE_SCALE * scale_up,
        reverse * scale_down
      )
    end

    # Triangulate via USD without materializing intermediate rate.
    # rate(from→to) = rate(USD→to) / rate(USD→from).
    # Each USD-pair may be direct or inverse; resolved as (numerator, denominator) fraction.
    if from != "USD" && to != "USD"
      from_num, from_den = resolve_rate_fraction(base: "USD", quote: from, at: at, organization: organization)
      to_num,   to_den   = resolve_rate_fraction(base: "USD", quote: to,   at: at, organization: organization)
      if from_num && to_num
        # rate(from→to) = (to_num/to_den) / (from_num/from_den) = (to_num * from_den) / (to_den * from_num)
        return half_even_div(
          amount_cents * to_num * from_den * scale_up,
          to_den * from_num * scale_down
        )
      end
    end

    raise RateNotFound.new(from: from, to: to, at: at, organization_id: organization&.id)
  end

  def self.lookup_direct(base:, quote:, at:, organization:)
    manual = ExchangeRate.for_organization(organization).by_pair(base, quote).effective_on(at).first
    return manual.rate_x1e10 if manual

    api = ExchangeRate.global.by_pair(base, quote).effective_on(at).first
    api&.rate_x1e10
  end

  # Returns [numerator, denominator] — an exact rate as a fraction in major units,
  # without integer truncation. Supports direct and inverse lookup.
  def self.resolve_rate_fraction(base:, quote:, at:, organization:)
    direct = lookup_direct(base: base, quote: quote, at: at, organization: organization)
    return [ direct, RATE_SCALE ] if direct

    reverse = lookup_direct(base: quote, quote: base, at: at, organization: organization)
    return [ RATE_SCALE, reverse ] if reverse

    [ nil, nil ]
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
