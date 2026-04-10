module Api
  module V1
    class AllUnitsController < BaseController
      def index
        authorize Unit, :index?
        units = Current.organization.units.includes(:property).order("properties.name", :name)
        render json: units.map { |u|
          {
            id: u.id,
            property_id: u.property_id,
            property_name: u.property.name,
            name: u.name,
            unit_type: u.unit_type,
            capacity: u.capacity,
            status: u.status,
            base_price_cents: u.base_price_cents
          }
        }
      end
    end
  end
end
