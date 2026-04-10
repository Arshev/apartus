require "net/http"

class ChannelSyncJob < ApplicationJob
  queue_as :default

  def perform(channel_id)
    channel = Channel.find_by(id: channel_id)
    return unless channel&.ical_import_url.present?

    unit = channel.unit
    ical_data = fetch_ical(channel.ical_import_url)
    return if ical_data.blank?

    events = parse_ical_events(ical_data)
    events.each do |event|
      next if event[:dtstart].blank? || event[:dtend].blank?

      existing = unit.reservations.find_by(
        check_in: event[:dtstart],
        check_out: event[:dtend],
        notes: "ical:#{event[:uid]}"
      )
      next if existing

      unit.reservations.create(
        check_in: event[:dtstart],
        check_out: event[:dtend],
        status: :confirmed,
        guests_count: 1,
        total_price_cents: 0,
        notes: "ical:#{event[:uid]}"
      )
    end

    channel.update!(last_synced_at: Time.current)
  rescue StandardError => e
    Rails.logger.error("ChannelSyncJob failed for channel##{channel_id}: #{e.class} #{e.message}")
  end

  private

  def fetch_ical(url)
    uri = URI.parse(url)
    response = Net::HTTP.get_response(uri)
    response.is_a?(Net::HTTPSuccess) ? response.body : nil
  rescue StandardError => e
    Rails.logger.error("ChannelSyncJob fetch failed: #{e.message}")
    nil
  end

  def parse_ical_events(data)
    events = []
    current = nil

    data.each_line do |line|
      line = line.strip
      case line
      when "BEGIN:VEVENT"
        current = {}
      when "END:VEVENT"
        events << current if current
        current = nil
      when /^DTSTART;?.*:(\d{8})/
        current[:dtstart] = Date.parse($1) if current
      when /^DTEND;?.*:(\d{8})/
        current[:dtend] = Date.parse($1) if current
      when /^UID:(.*)/
        current[:uid] = $1.strip if current
      when /^SUMMARY:(.*)/
        current[:summary] = $1.strip if current
      end
    end

    events
  end
end
