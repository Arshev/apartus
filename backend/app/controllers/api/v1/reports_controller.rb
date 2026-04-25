module Api
  module V1
    class ReportsController < BaseController
      def financial
        authorize :report, :financial?
        from = parse_date(params[:from], Date.current.beginning_of_month)
        to = parse_date(params[:to], Date.current.end_of_month)
        target = validated_target_currency
        return if performed?
        render json: build_financial_data(from, to, target: target)
      end

      def financial_pdf
        authorize :report, :financial?
        from = parse_date(params[:from], Date.current.beginning_of_month)
        to = parse_date(params[:to], Date.current.end_of_month)
        target = validated_target_currency
        return if performed?

        data = build_financial_data(from, to, target: target)
        pdf = Pdf::FinancialReportPdf.new(Current.organization, data).render_pdf
        send_data pdf, filename: "financial_report_#{from}_#{to}.pdf",
                       type: "application/pdf", disposition: "attachment"
      end

      private

      def build_financial_data(from, to, target: nil)
        days = (to - from).to_i + 1
        org = Current.organization

        reservations = Reservation.joins(unit: :property)
          .where(properties: { organization_id: org.id })
          .where(status: [ :confirmed, :checked_in, :checked_out ])
          .where("check_in <= ? AND check_out >= ?", to, from)

        total_revenue = reservations.sum(:total_price_cents)
        revenue_by_property = reservations.joins(unit: :property).group("properties.name")
          .sum(:total_price_cents).map { |name, rev| { property_name: name, revenue: rev } }

        expenses = org.expenses.where(expense_date: from..to)
        total_expenses = expenses.sum(:amount_cents)
        expenses_by_category = expenses.group(:category).sum(:amount_cents)
          .map { |cat, total| { category: cat, total: total } }

        total_units = org.units.count
        total_room_nights = total_units * days
        occupied_nights = reservations
          .pick(Arel.sql("COALESCE(SUM(LEAST(check_out, '#{to + 1}'::date) - GREATEST(check_in, '#{from}'::date)), 0)")).to_i

        occupancy_rate = total_room_nights.positive? ? (occupied_nights.to_f / total_room_nights).round(4) : 0.0
        adr = occupied_nights.positive? ? (total_revenue.to_f / occupied_nights).round(0).to_i : 0
        revpar = total_room_nights.positive? ? (total_revenue.to_f / total_room_nights).round(0).to_i : 0

        data = {
          from: from, to: to, total_revenue: total_revenue, total_expenses: total_expenses,
          net_income: total_revenue - total_expenses, revenue_by_property: revenue_by_property,
          expenses_by_category: expenses_by_category, occupancy_rate: occupancy_rate,
          adr: adr, revpar: revpar, total_room_nights: total_room_nights, occupied_nights: occupied_nights
        }

        apply_currency_conversion!(data, target: target, to_date: to)
        data
      end

      # FT-039: convert cents fields when target currency set and differs from org.
      def apply_currency_conversion!(data, target:, to_date:)
        org = Current.organization
        if target.blank? || target == org.currency
          data.merge!(currency: org.currency, fx_rate_x1e10: nil, currency_fallback_reason: nil)
          return
        end

        effective_at = [ to_date, Date.current ].min
        original_total = data[:total_revenue]

        begin
          convert = ->(cents) {
            CurrencyConverter.convert(amount_cents: cents, from: org.currency, to: target, at: effective_at, organization: org)
          }
          data[:total_revenue]  = convert.call(data[:total_revenue])
          data[:total_expenses] = convert.call(data[:total_expenses])
          data[:net_income]     = convert.call(data[:net_income])
          data[:adr]            = convert.call(data[:adr])
          data[:revpar]         = convert.call(data[:revpar])
          data[:revenue_by_property] = data[:revenue_by_property].map { |r| r.merge(revenue: convert.call(r[:revenue])) }
          data[:expenses_by_category] = data[:expenses_by_category].map { |e| e.merge(total: convert.call(e[:total])) }
          data[:currency] = target
          data[:fx_rate_x1e10] = original_total.positive? ? (data[:total_revenue] * (10**10)) / original_total : nil
          data[:currency_fallback_reason] = nil
        rescue CurrencyConverter::RateNotFound
          data[:currency] = org.currency
          data[:fx_rate_x1e10] = nil
          data[:currency_fallback_reason] = "rate_not_found"
        end
      end

      def parse_date(param, default)
        return default if param.blank?
        Date.parse(param)
      rescue Date::Error, ArgumentError
        default
      end
    end
  end
end
