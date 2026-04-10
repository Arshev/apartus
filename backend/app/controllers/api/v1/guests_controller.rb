module Api
  module V1
    class GuestsController < BaseController
      def index
        authorize Guest
        guests = Current.organization.guests.order(:id)
        render json: guests.map { |g| guest_json(g) }
      end

      def show
        guest = find_guest
        return if performed?

        authorize guest
        render json: guest_json(guest)
      end

      def timeline
        guest = find_guest
        return if performed?

        authorize guest, :show?
        reservations = guest.reservations
          .joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .includes(:unit)
          .order(check_in: :desc)

        render json: reservations.map { |r|
          {
            id: r.id,
            unit_name: r.unit.name,
            check_in: r.check_in,
            check_out: r.check_out,
            status: r.status,
            total_price_cents: r.total_price_cents
          }
        }
      end

      def create
        authorize Guest
        guest = Current.organization.guests.new(guest_params)
        if guest.save
          render json: guest_json(guest), status: :created
        else
          render json: { error: guest.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        guest = find_guest
        return if performed?

        authorize guest
        if guest.update(guest_params)
          render json: guest_json(guest)
        else
          render json: { error: guest.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        guest = find_guest
        return if performed?

        authorize guest
        guest.destroy!
        render json: { message: "Deleted" }
      end

      private

      def find_guest
        guest = Current.organization.guests.find_by(id: params[:id])
        unless guest
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        guest
      end

      def guest_params
        params.require(:guest).permit(:first_name, :last_name, :email, :phone, :notes, :source, tags: [])
      end

      def guest_json(guest)
        {
          id: guest.id,
          organization_id: guest.organization_id,
          first_name: guest.first_name,
          last_name: guest.last_name,
          full_name: guest.full_name,
          email: guest.email,
          phone: guest.phone,
          notes: guest.notes,
          tags: guest.tags,
          source: guest.source,
          reservations_count: guest.reservations.count,
          created_at: guest.created_at,
          updated_at: guest.updated_at
        }
      end
    end
  end
end
