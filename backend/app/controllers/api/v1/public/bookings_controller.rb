module Api
  module V1
    module Public
      class BookingsController < ActionController::API
        def availability
          organization = Organization.find_by(slug: params[:slug])
          unless organization
            render json: { error: "Not found" }, status: :not_found
            return
          end

          from = Date.parse(params[:from]) rescue Date.current
          to = Date.parse(params[:to]) rescue (Date.current + 14)

          units = organization.units.includes(:property, :seasonal_prices)

          available = units.map do |unit|
            # Check if unit has overlapping active reservations for full date range
            overlap = unit.reservations
              .where(status: [ :confirmed, :checked_in ])
              .where("check_in < ? AND check_out > ?", to, from)
              .exists?

            next if overlap

            total_price = PriceCalculator.call(unit, from, to)

            {
              id: unit.id,
              name: unit.name,
              property_name: unit.property.name,
              unit_type: unit.unit_type,
              capacity: unit.capacity,
              total_price_cents: total_price,
              base_price_cents: unit.base_price_cents
            }
          end.compact

          render json: { organization: organization.name, from: from, to: to, units: available }
        end

        def create
          organization = Organization.find_by(slug: params[:slug])
          unless organization
            render json: { error: "Not found" }, status: :not_found
            return
          end

          unit = organization.units.find_by(id: params[:unit_id])
          unless unit
            render json: { error: "Unit not found" }, status: :not_found
            return
          end

          # Find or create guest
          guest = nil
          if params[:guest_email].present?
            guest = organization.guests.find_or_initialize_by(email: params[:guest_email].downcase.strip)
            guest.first_name = params[:guest_name]&.split(" ")&.first || "Guest"
            guest.last_name = params[:guest_name]&.split(" ")&.drop(1)&.join(" ").presence || "—"
            guest.phone = params[:guest_phone] if params[:guest_phone].present?
            guest.save!
          end

          reservation = unit.reservations.new(
            guest: guest,
            check_in: params[:check_in],
            check_out: params[:check_out],
            guests_count: params[:guests_count] || 1,
            status: :confirmed,
            total_price_cents: PriceCalculator.call(unit, Date.parse(params[:check_in]), Date.parse(params[:check_out]))
          )

          if reservation.save
            NotificationSender.send_booking_confirmation(reservation) if guest
            render json: {
              id: reservation.id,
              unit_name: unit.name,
              check_in: reservation.check_in,
              check_out: reservation.check_out,
              total_price_cents: reservation.total_price_cents,
              status: reservation.status
            }, status: :created
          else
            render json: { error: reservation.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.record.errors.full_messages }, status: :unprocessable_entity
        end
      end
    end
  end
end
