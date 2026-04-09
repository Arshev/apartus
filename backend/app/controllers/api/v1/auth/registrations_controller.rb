module Api
  module V1
    module Auth
      class RegistrationsController < ApplicationController
        rate_limit to: 3, within: 1.hour, by: -> { request.ip }, with: -> {
          render json: { error: "Too many requests" }, status: :too_many_requests
        }

        def create
          ActiveRecord::Base.transaction do
            @organization = Organization.create!(name: params[:organization_name])

            @user = User.create!(
              email: params[:email],
              password: params[:password],
              password_confirmation: params[:password_confirmation],
              first_name: params[:first_name],
              last_name: params[:last_name]
            )

            admin_role = @organization.roles.find_by(code: "admin")
            @organization.memberships.create!(
              user: @user,
              role_enum: :owner,
              role: admin_role
            )

            tokens = JsonWebToken.encode_pair(@user.id)
            render json: {
              token: tokens[:access_token],
              refresh_token: tokens[:refresh_token],
              user: {
                id: @user.id,
                email: @user.email,
                first_name: @user.first_name,
                last_name: @user.last_name,
                full_name: @user.full_name
              },
              organization: {
                id: @organization.id,
                name: @organization.name,
                slug: @organization.slug
              }
            }, status: :created
          end
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end
