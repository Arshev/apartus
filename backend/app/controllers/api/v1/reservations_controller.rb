module Api
  module V1
    class ReservationsController < BaseController
      def index
        authorize Reservation
        scope = org_reservations.includes(:unit, :guest).order(check_in: :desc)
        scope = scope.where(unit_id: params[:unit_id]) if params[:unit_id].present?
        scope = scope.where(status: params[:status]) if params[:status].present?
        scope = scope.where("check_out >= ?", params[:from]) if params[:from].present?
        scope = scope.where("check_in <= ?", params[:to]) if params[:to].present?
        render json: scope.map { |r| reservation_json(r) }
      end

      def show
        reservation = find_reservation
        return if performed?
        authorize reservation
        render json: reservation_json(reservation)
      end

      def create
        authorize Reservation
        unit = Current.organization.units.find_by(id: params.dig(:reservation, :unit_id))
        unless unit
          render json: { error: "Unit not found" }, status: :not_found
          return
        end

        reservation = unit.reservations.new(reservation_params.except(:unit_id))
        resolve_guest(reservation)
        return if performed?

        if reservation.total_price_cents.zero? && reservation.check_in.present? && reservation.check_out.present?
          reservation.total_price_cents = PriceCalculator.call(unit, reservation.check_in, reservation.check_out)
        end

        if reservation.save
          NotificationSender.send_booking_confirmation(reservation)
          render json: reservation_json(reservation), status: :created
        else
          render json: { error: reservation.errors.full_messages }, status: :unprocessable_entity
        end
      rescue ActiveRecord::StatementInvalid => e
        if e.message.include?("no_overlapping_reservations")
          render json: { error: [ "Даты пересекаются с другим бронированием" ] }, status: :conflict
        else
          raise
        end
      end

      def update
        reservation = find_reservation
        return if performed?
        authorize reservation

        if reservation.update(reservation_params.except(:unit_id))
          render json: reservation_json(reservation)
        else
          render json: { error: reservation.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        reservation = find_reservation
        return if performed?
        authorize reservation
        reservation.destroy!
        render json: { message: "Deleted" }
      end

      def check_in
        transition(:check_in, :can_check_in?, :checked_in)
      end

      def check_out
        transition(:check_out, :can_check_out?, :checked_out)
      end

      def cancel
        transition(:cancel, :can_cancel?, :cancelled)
      end

      private

      def transition(action_name, guard, new_status)
        reservation = find_reservation
        return if performed?
        authorize reservation, :"#{action_name}?"

        unless reservation.send(guard)
          render json: { error: "Невозможный переход статуса" }, status: :unprocessable_entity
          return
        end

        reservation.update!(status: new_status)

        case new_status
        when :checked_in then NotificationSender.send_check_in_reminder(reservation)
        when :checked_out then NotificationSender.send_check_out_thank_you(reservation)
        end

        render json: reservation_json(reservation)
      end

      def org_reservations
        Reservation.joins(unit: :property).where(properties: { organization_id: Current.organization.id })
      end

      def find_reservation
        reservation = org_reservations.find_by(id: params[:id])
        unless reservation
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        reservation
      end

      def resolve_guest(reservation)
        guest_id = params.dig(:reservation, :guest_id)
        return if guest_id.blank?

        guest = Current.organization.guests.find_by(id: guest_id)
        unless guest
          render json: { error: "Guest not found" }, status: :not_found
          return
        end
        reservation.guest = guest
      end

      def reservation_params
        params.require(:reservation).permit(
          :unit_id, :guest_id, :check_in, :check_out,
          :guests_count, :notes
        )
      end

      def reservation_json(r)
        {
          id: r.id,
          unit_id: r.unit_id,
          unit_name: r.unit.name,
          property_name: r.unit.property.name,
          guest_id: r.guest_id,
          guest_name: r.guest&.full_name,
          check_in: r.check_in,
          check_out: r.check_out,
          status: r.status,
          guests_count: r.guests_count,
          total_price_cents: r.total_price_cents,
          notes: r.notes,
          created_at: r.created_at,
          updated_at: r.updated_at
        }
      end
    end
  end
end
