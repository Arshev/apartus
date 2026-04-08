module Api
  module V1
    class MembersController < BaseController
      def index
        authorize Membership
        memberships = Current.organization.memberships.includes(:user, :role)
        render json: memberships.map { |m| membership_json(m) }
      end

      def create
        authorize Membership

        user = User.find_by(email: params[:email])
        user ||= User.create!(
          email: params[:email],
          password: params[:password],
          password_confirmation: params[:password_confirmation],
          first_name: params[:first_name],
          last_name: params[:last_name]
        )

        membership = Current.organization.memberships.create!(
          user: user,
          role_enum: params[:role] || :member,
          role_id: params[:role_id]
        )

        render json: membership_json(membership), status: :created
      rescue ActiveRecord::RecordInvalid => e
        render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
      end

      def update
        membership = Current.organization.memberships.find(params[:id])
        authorize membership

        if membership.update(membership_params)
          render json: membership_json(membership)
        else
          render json: { error: membership.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        membership = Current.organization.memberships.find(params[:id])
        authorize membership
        membership.destroy!
        head :no_content
      end

      private

      def membership_params
        params.permit(:role_enum, :role_id)
      end

      def membership_json(m)
        {
          id: m.id,
          user: {
            id: m.user.id,
            email: m.user.email,
            first_name: m.user.first_name,
            last_name: m.user.last_name,
            full_name: m.user.full_name
          },
          role: m.role_enum,
          role_name: m.role&.name,
          permissions: m.permissions,
          created_at: m.created_at
        }
      end
    end
  end
end
