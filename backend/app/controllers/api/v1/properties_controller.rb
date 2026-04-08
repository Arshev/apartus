module Api
  module V1
    class PropertiesController < BaseController
      def index
        authorize Property
        properties = Current.organization.properties.order(:id)
        render json: properties.map { |p| property_json(p) }
      end

      def show
        property = find_property
        return if performed?

        authorize property
        render json: property_json(property)
      end

      def create
        authorize Property
        property = Current.organization.properties.new(property_params)
        if property.save
          render json: property_json(property), status: :created
        else
          render json: { error: property.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        property = find_property
        return if performed?

        authorize property

        if property.update(property_params)
          render json: property_json(property)
        else
          render json: { error: property.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        property = find_property
        return if performed?

        authorize property
        property.destroy!
        head :no_content
      end

      private

      def find_property
        property = Current.organization.properties.find_by(id: params[:id])
        unless property
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        property
      end

      def property_params
        params.require(:property).permit(:name, :address, :property_type, :description)
      end

      def property_json(property)
        {
          id: property.id,
          organization_id: property.organization_id,
          name: property.name,
          address: property.address,
          property_type: property.property_type,
          description: property.description,
          created_at: property.created_at,
          updated_at: property.updated_at
        }
      end
    end
  end
end
