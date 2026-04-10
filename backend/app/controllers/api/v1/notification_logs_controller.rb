module Api
  module V1
    class NotificationLogsController < BaseController
      def index
        authorize :notification_log, :index?
        reservation = find_reservation
        return if performed?

        render json: reservation.notification_logs.order(sent_at: :desc).map { |n|
          {
            id: n.id,
            event_type: n.event_type,
            channel: n.channel,
            recipient_email: n.recipient_email,
            sent_at: n.sent_at
          }
        }
      end

      private

      def find_reservation
        reservation = Reservation
          .joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .find_by(id: params[:reservation_id])

        unless reservation
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        reservation
      end
    end
  end
end
