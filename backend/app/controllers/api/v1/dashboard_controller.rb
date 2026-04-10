module Api
  module V1
    class DashboardController < BaseController
      def show
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

        render json: {
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
      end

      private

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
