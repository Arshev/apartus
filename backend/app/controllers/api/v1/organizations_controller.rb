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
        render json: org_json(Current.organization)
      end

      def update
        authorize Current.organization
        if Current.organization.update(organization_params)
          render json: org_json(Current.organization)
            settings: Current.organization.settings
          }
        else
          render json: { error: Current.organization.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def test_telegram
        authorize Current.organization, :update?
        if TelegramNotifier.send_test(Current.organization)
          render json: { message: "Test message sent" }
        else
          render json: { error: "Telegram not configured or send failed" }, status: :unprocessable_entity
        end
      end

      private

      def organization_params
        params.require(:organization).permit(:name, :currency, settings: {})
      end

      def org_json(org)
        {
          id: org.id,
          name: org.name,
          slug: org.slug,
          currency: org.currency,
          currency_config: CurrencyConfig.config_for(org.currency),
          settings: org.settings
        }
      end
    end
  end
end
