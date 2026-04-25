module Api
  module V1
    class DashboardController < BaseController
      def show
        authorize :dashboard, :show?
        target = validated_target_currency
        return if performed?
        today = Date.current
        month_start = today.beginning_of_month
        month_end = today.end_of_month

        units = Current.organization.units
        total_units = units.count

        # Units with active reservation overlapping today
        occupied_unit_ids = Reservation
          .joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .where(status: [ :confirmed, :checked_in ])
          .where("check_in <= ? AND check_out > ?", today, today)
          .distinct
          .pluck(:unit_id)

        occupied_units = occupied_unit_ids.size
        occupancy_rate = total_units.positive? ? (occupied_units.to_f / total_units).round(4) : 0.0

        # Revenue this month
        revenue_this_month = Reservation
          .joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .where(status: [ :confirmed, :checked_in, :checked_out ])
          .where("check_in <= ? AND check_out >= ?", month_end, month_start)
          .sum(:total_price_cents)

        # Upcoming check-ins (next 7 days)
        upcoming_check_ins = Reservation
          .joins(unit: :property)
          .includes(:unit, :guest)
          .where(properties: { organization_id: Current.organization.id })
          .where(status: :confirmed)
          .where(check_in: today..(today + 7))
          .order(:check_in)
          .limit(10)

        # Upcoming check-outs (next 7 days)
        upcoming_check_outs = Reservation
          .joins(unit: :property)
          .includes(:unit, :guest)
          .where(properties: { organization_id: Current.organization.id })
          .where(status: :checked_in)
          .where(check_out: today..(today + 7))
          .order(:check_out)
          .limit(10)

        # Reservations by status
        status_counts = Reservation
          .joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .group(:status)
          .count

        data = {
          total_units: total_units,
          occupied_units: occupied_units,
          occupancy_rate: occupancy_rate,
          revenue_this_month: revenue_this_month,
          upcoming_check_ins: upcoming_check_ins.map { |r| reservation_summary(r) },
          upcoming_check_outs: upcoming_check_outs.map { |r| reservation_summary(r) },
          reservations_by_status: {
            confirmed: status_counts["confirmed"] || 0,
            checked_in: status_counts["checked_in"] || 0,
            checked_out: status_counts["checked_out"] || 0,
            cancelled: status_counts["cancelled"] || 0
          }
        }

        apply_currency_conversion!(data, target: target)
        render json: data
      end

      private

      # FT-039: dashboard conversion — only revenue_this_month is cents.
      # effective_at = Date.current (snapshot, no from/to).
      def apply_currency_conversion!(data, target:)
        org = Current.organization
        if target.blank? || target == org.currency
          data.merge!(currency: org.currency, fx_rate_x1e10: nil, currency_fallback_reason: nil)
          return
        end

        original = data[:revenue_this_month]
        begin
          converted = CurrencyConverter.convert(
            amount_cents: original, from: org.currency, to: target,
            at: Date.current, organization: org
          )
          data[:revenue_this_month] = converted
          data[:currency] = target
          data[:fx_rate_x1e10] = original.positive? ? (converted * (10**10)) / original : nil
          data[:currency_fallback_reason] = nil
        rescue CurrencyConverter::RateNotFound
          data[:currency] = org.currency
          data[:fx_rate_x1e10] = nil
          data[:currency_fallback_reason] = "rate_not_found"
        end
      end

      def reservation_summary(r)
        {
          id: r.id,
          unit_name: r.unit.name,
          guest_name: r.guest&.full_name,
          check_in: r.check_in,
          check_out: r.check_out,
          status: r.status
        }
      end
    end
  end
end
