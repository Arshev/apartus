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

        permitted = params.require(:property).permit(
          :name, :address, :property_type, :description, :branch_id, :owner_id
        )
        property_attrs = permitted.slice(:name, :address, :property_type, :description)

        property = Current.organization.properties.new(property_attrs)

        # SECURITY: branch resolved via scope, NOT passed as raw id.
        # See resolve_branch_or_error and Spec F5 §4.2 ANTI-PATTERN.
        if permitted.key?(:branch_id)
          branch_or_error = resolve_branch_or_error(permitted[:branch_id])
          if branch_or_error == :not_in_scope
            render json: { error: [ "Branch must exist" ] },
                   status: :unprocessable_entity
            return
          end
          property.branch = branch_or_error
        end

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

        permitted = params.require(:property).permit(
          :name, :address, :property_type, :description, :branch_id, :owner_id
        )
        property.assign_attributes(permitted.slice(:name, :address, :property_type, :description))

        # SECURITY: same pattern as create — see resolve_branch_or_error.
        if params[:property].key?(:branch_id)
          branch_or_error = resolve_branch_or_error(permitted[:branch_id])
          if branch_or_error == :not_in_scope
            render json: { error: [ "Branch must exist" ] },
                   status: :unprocessable_entity
            return
          end
          property.branch = branch_or_error
        end

        if property.save
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

      # SECURITY: branch MUST be resolved via Current.organization scope.
      # Passing branch_id directly into new/update would let Rails resolve
      # it via global Branch.find (belongs_to :branch, optional: true),
      # crossing organization boundaries. See Spec F5 §4.2 ANTI-PATTERN.
      def resolve_branch_or_error(raw_id)
        return nil if raw_id.blank?

        branch = Current.organization.branches.find_by(id: raw_id)
        branch || :not_in_scope
      end

      def property_json(property)
        {
          id: property.id,
          organization_id: property.organization_id,
          branch_id: property.branch_id,
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
