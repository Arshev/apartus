module Api
  module V1
    class AmenitiesController < BaseController
      def index
        authorize Amenity
        amenities = Current.organization.amenities.order(:id)
        render json: amenities.map { |a| amenity_json(a) }
      end

      def show
        amenity = find_amenity
        return if performed?

        authorize amenity
        render json: amenity_json(amenity)
      end

      def create
        authorize Amenity
        amenity = Current.organization.amenities.new(amenity_params)
        if amenity.save
          render json: amenity_json(amenity), status: :created
        else
          render json: { error: amenity.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        amenity = find_amenity
        return if performed?

        authorize amenity

        if amenity.update(amenity_params)
          render json: amenity_json(amenity)
        else
          render json: { error: amenity.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        amenity = find_amenity
        return if performed?

        authorize amenity

        if amenity.destroy
          head :no_content
        else
          render json: { error: amenity.errors.full_messages }, status: :conflict
        end
      end

      private

      def find_amenity
        amenity = Current.organization.amenities.find_by(id: params[:id])
        unless amenity
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        amenity
      end

      def amenity_params
        params.require(:amenity).permit(:name)
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
    end
  end
end
