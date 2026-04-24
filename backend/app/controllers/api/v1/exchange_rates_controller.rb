module Api
  module V1
    class ExchangeRatesController < BaseController
      def index
        authorize ExchangeRate
        resolved = policy_scope(ExchangeRate).order(effective_date: :desc, base_currency: :asc, quote_currency: :asc)

        api_rates       = resolved.where(organization_id: nil)
        manual_overrides = resolved.where(organization_id: Current.organization.id)

        render json: {
          api_rates: api_rates.map { |r| rate_json(r) },
          manual_overrides: manual_overrides.map { |r| rate_json(r) }
        }
      end

      def create
        authorize ExchangeRate
        rate = Current.organization.exchange_rates.new(rate_params.merge(source: "manual"))
        if rate.save
          render json: rate_json(rate), status: :created
        else
          render json: { error: rate.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::RecordNotUnique
        render json: { error: [ "Duplicate rate for this currency pair and date" ] }, status: :unprocessable_entity
      end

      # Lookup uses read scope (global ∪ own-org). NULL API row reaches `authorize`
      # and policy denies mutation → 403 (CON-03/EC-05/NEG-08). Other-org row not
      # in scope → RecordNotFound → 404 via BaseController rescue (CON-03/EC-04).
      def update
        rate = policy_scope(ExchangeRate).find(params[:id])
        authorize rate
        if rate.update(rate_params.except(:source))
          render json: rate_json(rate)
        else
          render json: { error: rate.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        rate = policy_scope(ExchangeRate).find(params[:id])
        authorize rate
        rate.destroy!
        render json: { message: "Deleted" }
      end

      private

      def rate_params
        params.require(:exchange_rate).permit(
          :base_currency, :quote_currency, :rate_x1e10, :effective_date, :note
        )
      end

      def rate_json(r)
        {
          id: r.id,
          base_currency: r.base_currency,
          quote_currency: r.quote_currency,
          rate_x1e10: r.rate_x1e10,
          effective_date: r.effective_date,
          source: r.source,
          organization_id: r.organization_id,
          note: r.note,
          created_at: r.created_at,
          updated_at: r.updated_at
        }
      end
    end
  end
end
