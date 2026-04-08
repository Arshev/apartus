module Api
  module V1
    class UnitAmenitiesController < BaseController
      def index
        unit = find_unit
        return if performed?

        authorize :unit_amenity, :index?
        amenities = unit.amenities.order(:id)
        render json: amenities.map { |a| amenity_json(a) }
      end

      def create
        unit = find_unit
        return if performed?

        authorize :unit_amenity, :create?

        permitted = params.require(:unit_amenity).permit(:amenity_id)
        amenity = Current.organization.amenities.find_by(id: permitted[:amenity_id])
        unless amenity
          render json: { error: "Not found" }, status: :not_found
          return
        end

        unit_amenity = unit.unit_amenities.new(amenity: amenity)
        if unit_amenity.save
          render json: unit_amenity_json(unit_amenity), status: :created
        else
          render json: { error: unit_amenity.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        unit = find_unit
        return if performed?

        authorize :unit_amenity, :destroy?

        unit_amenity = unit.unit_amenities.find_by(amenity_id: params[:id])
        unless unit_amenity
          render json: { error: "Not found" }, status: :not_found
          return
        end

        unit_amenity.destroy!
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

      def amenity_json(amenity)
        {
          id: amenity.id,
          organization_id: amenity.organization_id,
          name: amenity.name,
          created_at: amenity.created_at,
          updated_at: amenity.updated_at
        }
      end

      def unit_amenity_json(ua)
        {
          id: ua.id,
          unit_id: ua.unit_id,
          amenity_id: ua.amenity_id,
          created_at: ua.created_at,
          updated_at: ua.updated_at
        }
      end
    end
  end
end
