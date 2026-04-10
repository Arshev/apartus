module Api
  module V1
    module Public
      class BookingsController < ActionController::API
        rate_limit to: 20, within: 1.minute, by: -> { request.ip }, only: :create

        def availability
          organization = Organization.find_by(slug: params[:slug])
          unless organization
            render json: { error: "Not found" }, status: :not_found
            return
          end

          from = parse_date(params[:from], Date.current)
          to = parse_date(params[:to], Date.current + 14)

          units = organization.units.includes(:property, :seasonal_prices)

          available = units.map do |unit|
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

          check_in = parse_date(params[:check_in], nil)
          check_out = parse_date(params[:check_out], nil)
          unless check_in && check_out
            render json: { error: "Invalid date format. Use YYYY-MM-DD." }, status: :unprocessable_entity
            return
          end

          unit = organization.units.find_by(id: params[:unit_id])
          unless unit
            render json: { error: "Unit not found" }, status: :not_found
            return
          end

          guest = resolve_guest(organization)
          return if performed?

          reservation = unit.reservations.new(
            guest: guest,
            check_in: check_in,
            check_out: check_out,
            guests_count: params[:guests_count] || 1,
            status: :confirmed,
            total_price_cents: PriceCalculator.call(unit, check_in, check_out)
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
        rescue ActiveRecord::StatementInvalid => e
          if e.message.include?("no_overlapping_reservations")
            render json: { error: [ "Даты пересекаются с другим бронированием" ] }, status: :conflict
          else
            raise
          end
        end

        private

        def parse_date(param, default)
          return default if param.blank?
          Date.parse(param)
        rescue Date::Error, ArgumentError
          default
        end

        def resolve_guest(organization)
          return nil if params[:guest_email].blank?

          guest = organization.guests.find_or_initialize_by(email: params[:guest_email].downcase.strip)
          if guest.new_record?
            name_parts = params[:guest_name].to_s.strip.split(" ", 2)
            guest.first_name = name_parts.first.presence || "Guest"
            guest.last_name = name_parts.last.presence || "—"
            guest.phone = params[:guest_phone] if params[:guest_phone].present?
          end
          guest.save!
          guest
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: "Invalid guest data: #{e.record.errors.full_messages.join(', ')}" },
                 status: :unprocessable_entity
          nil
        end
      end
    end
  end
end
