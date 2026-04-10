class PriceCalculator
  def self.call(unit, check_in, check_out)
    return 0 if check_in.blank? || check_out.blank? || check_out <= check_in

    base = unit.base_price_cents || 0
    seasonal = unit.seasonal_prices.to_a

    if base.zero? && seasonal.empty?
      Rails.logger.warn("PriceCalculator: unit##{unit.id} (#{unit.name}) has no pricing data — returning 0")
    end

    total = 0
    (check_in...check_out).each do |night|
      sp = seasonal.find { |s| night >= s.start_date && night < s.end_date }
      total += sp ? sp.price_cents : base
    end

    total
  end
end
