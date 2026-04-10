class PriceCalculator
  def self.call(unit, check_in, check_out)
    return 0 if check_in.blank? || check_out.blank? || check_out <= check_in

    base = unit.base_price_cents || 0
    seasonal = unit.seasonal_prices.to_a
    nights = (check_out - check_in).to_i

    if base.zero? && seasonal.empty?
      Rails.logger.warn("PriceCalculator: unit##{unit.id} (#{unit.name}) has no pricing data — returning 0")
    end

    # Base calculation
    total = 0
    (check_in...check_out).each do |night|
      sp = seasonal.find { |s| night >= s.start_date && night < s.end_date }
      total += sp ? sp.price_cents : base
    end

    # Apply active pricing rules
    rules = unit.pricing_rules.where(active: true).to_a

    # Length-of-stay discount
    length_rule = rules.select(&:length_discount?).find { |r| nights >= (r.min_nights || 0) }
    if length_rule
      total = (total * (100 - length_rule.discount_percent) / 100.0).round
    end

    # Last-minute discount
    days_until = (check_in - Date.current).to_i
    last_minute_rule = rules.select(&:last_minute?).find { |r| days_until <= (r.days_before || 0) }
    if last_minute_rule
      total = (total * (100 - last_minute_rule.discount_percent) / 100.0).round
    end

    # Occupancy-based markup
    occupancy_rule = rules.select(&:occupancy_markup?).first
    if occupancy_rule
      org = unit.property.organization
      total_units = org.units.count
      occupied = Reservation.joins(unit: :property)
        .where(properties: { organization_id: org.id })
        .where(status: [ :confirmed, :checked_in ])
        .where("check_in <= ? AND check_out > ?", check_in, check_in)
        .distinct.count(:unit_id)
      occupancy_pct = total_units.positive? ? (occupied * 100 / total_units) : 0
      if occupancy_pct >= (occupancy_rule.occupancy_threshold || 0)
        total = (total * (100 + occupancy_rule.markup_percent) / 100.0).round
      end
    end

    [ total, 0 ].max
  end
end
