module Api
  module V1
    class OrganizationsController < BaseController
      skip_before_action :set_current_organization, only: [ :index ]

      def index
        organizations = current_user.memberships.includes(:organization).map do |m|
          {
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
            role: m.role_enum
          }
        end
        render json: organizations
      end

      def show
        authorize Current.organization
        render json: {
          id: Current.organization.id,
          name: Current.organization.name,
          slug: Current.organization.slug,
          settings: Current.organization.settings
        }
      end

      def update
        authorize Current.organization
        if Current.organization.update(organization_params)
          render json: {
            id: Current.organization.id,
            name: Current.organization.name,
            slug: Current.organization.slug,
            settings: Current.organization.settings
          }
        else
          render json: { error: Current.organization.errors.full_messages }, status: :unprocessable_entity
        end
      end

      private

      def organization_params
        params.require(:organization).permit(:name, settings: {})
      end
    end
  end
end
