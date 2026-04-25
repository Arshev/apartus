module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      before_action :set_current_organization

      rescue_from Pundit::NotAuthorizedError, with: :forbidden
      rescue_from ActiveRecord::RecordNotFound, with: :not_found

      private

      def forbidden
        render json: { error: "Forbidden" }, status: :forbidden
      end

      def not_found
        render json: { error: "Not found" }, status: :not_found
      end

      # FT-037+ shared currency-conversion helpers used by reports/dashboard/
      # owner statement controllers. `params[:currency]` validation; on
      # invalid code renders 422 and returns nil — caller must `return if
      # performed?` (the existing pattern from each controller).
      def validated_target_currency
        return nil if params[:currency].blank?
        code = params[:currency]
        unless CurrencyConfig.codes.include?(code)
          render json: { error: [ "Invalid currency code: #{code}" ] }, status: :unprocessable_entity
          return nil
        end
        code
      end
    end
  end
end
