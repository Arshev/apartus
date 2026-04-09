module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      before_action :set_current_organization

      rescue_from Pundit::NotAuthorizedError, with: :forbidden

      private

      def forbidden
        render json: { error: "Forbidden" }, status: :forbidden
      end
    end
  end
end
