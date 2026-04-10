module Api
  module V1
    class ChannelsController < BaseController
      def index
        authorize :channel, :index?
        channels = Channel.joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .includes(unit: :property)
          .order("properties.name", "units.name")

        render json: channels.map { |c| channel_json(c) }
      end

      def create
        authorize :channel, :create?

        unit = Current.organization.units.find_by(id: params.dig(:channel, :unit_id))
        unless unit
          render json: { error: "Unit not found" }, status: :not_found
          return
        end

        channel = unit.channels.new(channel_params.except(:unit_id))
        if channel.save
          render json: channel_json(channel), status: :created
        else
          render json: { error: channel.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        channel = find_channel
        return if performed?
        authorize :channel, :update?

        if channel.update(channel_params.except(:unit_id))
          render json: channel_json(channel)
        else
          render json: { error: channel.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        channel = find_channel
        return if performed?
        authorize :channel, :destroy?
        channel.destroy!
        render json: { message: "Deleted" }
      end

      def sync
        channel = find_channel
        return if performed?
        authorize :channel, :update?

        unless channel.ical_import_url.present?
          render json: { error: "No import URL configured" }, status: :unprocessable_entity
          return
        end

        ChannelSyncJob.perform_later(channel.id)
        channel.update!(last_synced_at: Time.current)
        render json: channel_json(channel)
      end

      private

      def find_channel
        channel = Channel.joins(unit: :property)
          .where(properties: { organization_id: Current.organization.id })
          .find_by(id: params[:id])

        unless channel
          render json: { error: "Not found" }, status: :not_found
          return nil
        end
        channel
      end

      def channel_params
        params.require(:channel).permit(:unit_id, :platform, :ical_import_url, :sync_enabled)
      end

      def channel_json(c)
        {
          id: c.id,
          unit_id: c.unit_id,
          unit_name: c.unit.name,
          property_name: c.unit.property.name,
          platform: c.platform,
          ical_export_url: c.ical_export_path,
          ical_import_url: c.ical_import_url,
          sync_enabled: c.sync_enabled,
          last_synced_at: c.last_synced_at,
          created_at: c.created_at
        }
      end
    end
  end
end
