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
    end
  end
end
