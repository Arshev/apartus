module Api
  module V1
    class UnitsController < BaseController
      def index
        property = find_property
        return if performed?

        authorize Unit
        units = property.units.order(:id)
        render json: units.map { |u| unit_json(u) }
      end

      def show
        property = find_property
        return if performed?

        authorize Unit
        unit = find_unit(property)
        return if performed?

        render json: unit_json(unit)
      end

      def create
        property = find_property
        return if performed?

        authorize Unit
        unit = property.units.new(unit_params)
        if unit.save
          render json: unit_json(unit), status: :created
        else
          render json: { error: unit.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        property = find_property
        return if performed?

        authorize Unit
        unit = find_unit(property)
        return if performed?

        if unit.update(unit_params)
          render json: unit_json(unit)
        else
          render json: { error: unit.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        property = find_property
        return if performed?

        authorize Unit
        unit = find_unit(property)
        return if performed?

        unit.destroy!
        head :no_content
      end

      private

      def find_property
        property = Current.organization.properties.find_by(id: params[:property_id])
        unless property
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        property
      end

      def find_unit(property)
        unit = property.units.find_by(id: params[:id])
        unless unit
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        unit
      end

      def unit_params
        params.require(:unit).permit(:name, :unit_type, :capacity, :status)
      end

      def unit_json(unit)
        {
          id: unit.id,
          property_id: unit.property_id,
          name: unit.name,
          unit_type: unit.unit_type,
          capacity: unit.capacity,
          status: unit.status,
          created_at: unit.created_at,
          updated_at: unit.updated_at
        }
      end
    end
  end
end
