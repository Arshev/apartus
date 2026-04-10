module Api
  module V1
    module Public
      class IcalController < ActionController::API
        def show
          channel = Channel.find_by(ical_export_token: params[:token])
          unless channel
            head :not_found
            return
          end

          unit = channel.unit
          reservations = unit.reservations
            .where(status: [ :confirmed, :checked_in ])
            .where("check_out >= ?", Date.current - 30)
            .order(:check_in)

          ics = generate_ics(unit, reservations)
          render plain: ics, content_type: "text/calendar; charset=utf-8"
        end

        private

        def generate_ics(unit, reservations)
          lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Apartus PMS//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "X-WR-CALNAME:#{unit.name}"
          ]

          reservations.each do |r|
            lines += [
              "BEGIN:VEVENT",
              "UID:reservation-#{r.id}@apartus.local",
              "DTSTART;VALUE=DATE:#{r.check_in.strftime('%Y%m%d')}",
              "DTEND;VALUE=DATE:#{r.check_out.strftime('%Y%m%d')}",
              "SUMMARY:#{r.guest&.full_name || 'Blocked'}",
              "DESCRIPTION:Guests: #{r.guests_count}",
              "STATUS:CONFIRMED",
              "END:VEVENT"
            ]
          end

          lines << "END:VCALENDAR"
          lines.join("\r\n")
        end
      end
    end
  end
end
