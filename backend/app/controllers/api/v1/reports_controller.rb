module Api
  module V1
    class ReportsController < BaseController
      def financial
        authorize :report, :financial?
        from = parse_date(params[:from], Date.current.beginning_of_month)
        to = parse_date(params[:to], Date.current.end_of_month)
        days = (to - from).to_i + 1

        org = Current.organization

        # Revenue
        reservations = Reservation
          .joins(unit: :property)
          .where(properties: { organization_id: org.id })
          .where(status: [ :confirmed, :checked_in, :checked_out ])
          .where("check_in <= ? AND check_out >= ?", to, from)

        total_revenue = reservations.sum(:total_price_cents)

        revenue_by_property = reservations
          .joins(unit: :property)
          .group("properties.name")
          .sum(:total_price_cents)
          .map { |name, rev| { property_name: name, revenue: rev } }

        # Expenses
        expenses = org.expenses.where(expense_date: from..to)
        total_expenses = expenses.sum(:amount_cents)

        expenses_by_category = expenses.group(:category).sum(:amount_cents)
          .map { |cat, total| { category: cat, total: total } }

        # Occupancy metrics
        total_units = org.units.count
        total_room_nights = total_units * days

        # Count occupied room-nights via SQL (no N+1)
        occupied_nights = reservations
          .pick(Arel.sql(
            "COALESCE(SUM(LEAST(check_out, '#{to + 1}'::date) - GREATEST(check_in, '#{from}'::date)), 0)"
          )).to_i

        occupancy_rate = total_room_nights.positive? ? (occupied_nights.to_f / total_room_nights).round(4) : 0.0
        adr = occupied_nights.positive? ? (total_revenue.to_f / occupied_nights).round(0).to_i : 0
        revpar = total_room_nights.positive? ? (total_revenue.to_f / total_room_nights).round(0).to_i : 0

        render json: {
          from: from, to: to,
          total_revenue: total_revenue,
          total_expenses: total_expenses,
          net_income: total_revenue - total_expenses,
          revenue_by_property: revenue_by_property,
          expenses_by_category: expenses_by_category,
          occupancy_rate: occupancy_rate,
          adr: adr,
          revpar: revpar,
          total_room_nights: total_room_nights,
          occupied_nights: occupied_nights
        }
      end

      private

      def parse_date(param, default)
        return default if param.blank?
        Date.parse(param)
      rescue Date::Error, ArgumentError
        default
      end
    end
  end
end
