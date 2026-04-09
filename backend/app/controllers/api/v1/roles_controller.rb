module Api
  module V1
    class RolesController < BaseController
      def index
        authorize Role
        roles = Current.organization.roles
        render json: roles.map { |r| role_json(r) }
      end

      def create
        authorize Role
        role = Current.organization.roles.create!(role_params)
        render json: role_json(role), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      def update
        role = Current.organization.roles.find(params[:id])
        authorize role

        if role.update(role_params)
          render json: role_json(role)
        else
          render json: { error: role.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        role = Current.organization.roles.find(params[:id])
        authorize role

        if role.is_system?
          render json: { error: "Cannot delete system role" }, status: :forbidden
          return
        end

        role.destroy!
        head :no_content
      end

      private

      def role_params
        params.require(:role).permit(:name, :code, permissions: [])
      end

      def role_json(role)
        {
          id: role.id,
          name: role.name,
          code: role.code,
          permissions: role.permissions,
          is_system: role.is_system,
          members_count: role.memberships.count
        }
      end
    end
  end
end
