module Api
  module V1
    class BaseController < ApplicationController
      before_action :authenticate_user!
      before_action :set_current_organization
    end
  end
end
