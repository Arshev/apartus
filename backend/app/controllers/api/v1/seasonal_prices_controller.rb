module Api
  module V1
    class SeasonalPricesController < BaseController
      def index
        unit = find_unit
        return if performed?

        authorize :seasonal_price, :index?
        render json: unit.seasonal_prices.order(:start_date).map { |sp| sp_json(sp) }
      end

      def create
        unit = find_unit
        return if performed?

        authorize :seasonal_price, :create?
        sp = unit.seasonal_prices.new(sp_params)
        if sp.save
          render json: sp_json(sp), status: :created
        else
          render json: { error: sp.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        unit = find_unit
        return if performed?

        sp = unit.seasonal_prices.find_by(id: params[:id])
        unless sp
          render json: { error: "Not found" }, status: :not_found
          return
        end

        authorize :seasonal_price, :update?
        if sp.update(sp_params)
          render json: sp_json(sp)
        else
          render json: { error: sp.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        unit = find_unit
        return if performed?

        sp = unit.seasonal_prices.find_by(id: params[:id])
        unless sp
          render json: { error: "Not found" }, status: :not_found
          return
        end

        authorize :seasonal_price, :destroy?
        sp.destroy!
        head :no_content
      end

      private

      def find_unit
        unit = Current.organization.units.find_by(id: params[:unit_id])
        unless unit
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        unit
      end

      def sp_params
        params.require(:seasonal_price).permit(:start_date, :end_date, :price_cents)
      end

      def sp_json(sp)
        {
          id: sp.id,
          unit_id: sp.unit_id,
          start_date: sp.start_date,
          end_date: sp.end_date,
          price_cents: sp.price_cents,
          created_at: sp.created_at,
          updated_at: sp.updated_at
        }
      end
    end
  end
end
