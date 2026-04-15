module Api
  module V1
    module Auth
      class SessionsController < ApplicationController
        before_action :authenticate_user!, only: [ :show, :destroy ]

        def create
          user = User.find_by(email: params[:email])

          if user&.authenticate(params[:password])
            tokens = JsonWebToken.encode_pair(user.id)
            render json: {
              token: tokens[:access_token],
              refresh_token: tokens[:refresh_token],
              user: user_json(user),
              organizations: organizations_json(user)
            }
          else
            render json: { error: "Неверный email или пароль" }, status: :unauthorized
          end
        end

        def show
          org_id = request.headers["X-Organization-Id"]
          organization = org_id.present? ? current_user.organizations.find_by(id: org_id) : nil
          membership = organization ? current_user.membership_for(organization) : nil

          render json: {
            user: user_json(current_user),
            organization: organization ? organization_json(organization) : nil,
            membership: membership ? membership_json(membership) : nil,
            organizations: organizations_json(current_user)
          }
        end

        def refresh
          refresh_token = params[:refresh_token]
          decoded = JsonWebToken.decode(refresh_token)

          if decoded && decoded[:type] == "refresh"
            JsonWebToken.revoke(refresh_token)
            tokens = JsonWebToken.encode_pair(decoded[:user_id])
            render json: {
              token: tokens[:access_token],
              refresh_token: tokens[:refresh_token]
            }
          else
            render json: { error: "Invalid refresh token" }, status: :unauthorized
          end
        end

        def destroy
          token = extract_token_from_header
          JsonWebToken.revoke(token) if token
          render json: { message: "Logged out" }
        end

        private

        def user_json(user)
          {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            full_name: user.full_name
          }
        end

        def organization_json(org)
          {
            id: org.id,
            name: org.name,
            slug: org.slug,
            # Expose only locale — other keys in `settings` (e.g. telegram tokens)
            # are sensitive and must not leak through the auth/me boot payload.
            settings: { locale: org.settings&.dig("locale") }
          }
        end

        def membership_json(membership)
          {
            id: membership.id,
            role: membership.role_enum,
            permissions: membership.permissions,
            role_name: membership.role&.name
          }
        end

        def organizations_json(user)
          user.memberships.includes(:organization).map do |m|
            {
              id: m.organization.id,
              name: m.organization.name,
              slug: m.organization.slug,
              role: m.role_enum
            }
          end
        end
      end
    end
  end
end
