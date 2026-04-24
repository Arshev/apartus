module Api
  module V1
    class OwnersController < BaseController
      def index
        authorize Owner
        render json: Current.organization.owners.order(:name).map { |o| owner_json(o) }
      end

      def show
        owner = find_owner
        return if performed?
        authorize owner
        render json: owner_json(owner)
      end

      def create
        authorize Owner
        owner = Current.organization.owners.new(owner_params)
        if owner.save
          render json: owner_json(owner), status: :created
        else
          render json: { error: owner.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        owner = find_owner
        return if performed?
        authorize owner
        if owner.update(owner_params)
          render json: owner_json(owner)
        else
          render json: { error: owner.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        owner = find_owner
        return if performed?
        authorize owner
        owner.destroy!
        render json: { message: "Deleted" }
      end

      def statement
        owner = find_owner
        return if performed?
        authorize owner

        from = parse_date(params[:from], Date.current.beginning_of_month)
        to = parse_date(params[:to], Date.current.end_of_month)

        properties = owner.properties.where(organization_id: Current.organization.id)
        property_ids = properties.pluck(:id)

        revenue = Reservation.joins(unit: :property)
          .where(properties: { id: property_ids })
          .where(status: [ :confirmed, :checked_in, :checked_out ])
          .where("check_in <= ? AND check_out >= ?", to, from)
          .sum(:total_price_cents)

        expenses = Expense.where(property_id: property_ids, expense_date: from..to).sum(:amount_cents)

        commission = (revenue * owner.commission_rate / 10_000.0).round
        net_payout = revenue - commission - expenses

        per_property = properties.map do |p|
          p_revenue = Reservation.joins(unit: :property)
            .where(properties: { id: p.id })
            .where(status: [ :confirmed, :checked_in, :checked_out ])
            .where("check_in <= ? AND check_out >= ?", to, from)
            .sum(:total_price_cents)
          p_expenses = Expense.where(property_id: p.id, expense_date: from..to).sum(:amount_cents)
          p_commission = (p_revenue * owner.commission_rate / 10_000.0).round
          { property_name: p.name, revenue: p_revenue, expenses: p_expenses, commission: p_commission, payout: p_revenue - p_commission - p_expenses }
        end

        data = {
          owner_name: owner.name, from: from, to: to,
          commission_rate: owner.commission_rate,
          total_revenue: revenue, total_expenses: expenses,
          commission: commission, net_payout: net_payout,
          properties: per_property
        }

        # FT-038: convert to owner's preferred_currency when set and differs from org.
        org_currency = Current.organization.currency
        target_currency = owner.preferred_currency
        if target_currency.present? && target_currency != org_currency
          effective_at = [ to, Date.current ].min
          begin
            original_total = data[:total_revenue]
            data[:total_revenue]  = CurrencyConverter.convert(amount_cents: data[:total_revenue],  from: org_currency, to: target_currency, at: effective_at, organization: Current.organization)
            data[:total_expenses] = CurrencyConverter.convert(amount_cents: data[:total_expenses], from: org_currency, to: target_currency, at: effective_at, organization: Current.organization)
            data[:commission]     = CurrencyConverter.convert(amount_cents: data[:commission],     from: org_currency, to: target_currency, at: effective_at, organization: Current.organization)
            data[:net_payout]     = CurrencyConverter.convert(amount_cents: data[:net_payout],     from: org_currency, to: target_currency, at: effective_at, organization: Current.organization)
            data[:properties] = data[:properties].map do |p|
              {
                property_name: p[:property_name],
                revenue:    CurrencyConverter.convert(amount_cents: p[:revenue],    from: org_currency, to: target_currency, at: effective_at, organization: Current.organization),
                commission: CurrencyConverter.convert(amount_cents: p[:commission], from: org_currency, to: target_currency, at: effective_at, organization: Current.organization),
                expenses:   CurrencyConverter.convert(amount_cents: p[:expenses],   from: org_currency, to: target_currency, at: effective_at, organization: Current.organization),
                payout:     CurrencyConverter.convert(amount_cents: p[:payout],     from: org_currency, to: target_currency, at: effective_at, organization: Current.organization)
              }
            end
            data[:currency] = target_currency
            data[:fx_rate_x1e10] = original_total.positive? ? (data[:total_revenue] * (10**10)) / original_total : nil
            data[:currency_fallback_reason] = nil
          rescue CurrencyConverter::RateNotFound
            # fallback: keep original org-currency values
            data[:currency] = org_currency
            data[:fx_rate_x1e10] = nil
            data[:currency_fallback_reason] = "rate_not_found"
          end
        else
          data[:currency] = org_currency
          data[:fx_rate_x1e10] = nil
          data[:currency_fallback_reason] = nil
        end

        if params[:format] == "pdf"
          pdf = Pdf::OwnerStatementPdf.new(Current.organization, data).render_pdf
          send_data pdf, filename: "statement_#{owner.name.parameterize}_#{from}_#{to}.pdf",
                         type: "application/pdf", disposition: "attachment"
        else
          render json: data
        end
      end

      private

      def find_owner
        owner = Current.organization.owners.find_by(id: params[:id])
        unless owner
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        owner
      end

      def owner_params
        params.require(:owner).permit(:name, :email, :phone, :commission_rate, :notes, :preferred_currency)
      end

      def owner_json(o)
        {
          id: o.id,
          organization_id: o.organization_id,
          name: o.name,
          email: o.email,
          phone: o.phone,
          commission_rate: o.commission_rate,
          properties_count: o.properties.count,
          notes: o.notes,
          preferred_currency: o.preferred_currency,
          created_at: o.created_at
        }
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
