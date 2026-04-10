class PriceCalculator
  def self.call(unit, check_in, check_out)
    return 0 if check_in.blank? || check_out.blank? || check_out <= check_in

    seasonal = unit.seasonal_prices.to_a
    total = 0

    (check_in...check_out).each do |night|
      sp = seasonal.find { |s| night >= s.start_date && night < s.end_date }
      total += sp ? sp.price_cents : unit.base_price_cents
    end

    total
  end
end
