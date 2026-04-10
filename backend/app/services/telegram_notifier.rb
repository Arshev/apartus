require "net/http"
require "json"

class TelegramNotifier
  API_BASE = "https://api.telegram.org"

  def self.notify_booking(reservation)
    org = reservation.unit.property.organization
    return unless configured?(org)

    guest_name = reservation.guest&.full_name || "Блокировка"
    unit_name = reservation.unit.name
    property_name = reservation.unit.property.name
    currency = CurrencyConfig.config_for(org.currency)
    price = format_price(reservation.total_price_cents, currency)

    message = <<~MSG
      🏨 *Новое бронирование*

      📍 #{property_name} → #{unit_name}
      👤 #{guest_name}
      📅 #{reservation.check_in} — #{reservation.check_out}
      👥 Гостей: #{reservation.guests_count}
      💰 #{price}
      📋 Статус: #{status_label(reservation.status)}
    MSG

    send_message(org, message)
  end

  def self.notify_status_change(reservation, new_status)
    org = reservation.unit.property.organization
    return unless configured?(org)

    labels = { "checked_in" => "✅ Check-in", "checked_out" => "👋 Check-out", "cancelled" => "❌ Отмена" }
    label = labels[new_status] || new_status

    message = <<~MSG
      #{label}

      📍 #{reservation.unit.property.name} → #{reservation.unit.name}
      👤 #{reservation.guest&.full_name || "—"}
      📅 #{reservation.check_in} — #{reservation.check_out}
    MSG

    send_message(org, message)
  end

  def self.send_test(organization)
    return false unless configured?(organization)
    send_message(organization, "🔔 Тестовое уведомление от Apartus!\nВсё работает ✅")
    true
  end

  def self.configured?(org)
    org.settings&.dig("telegram_bot_token").present? &&
      org.settings&.dig("telegram_chat_id").present?
  end

  private

  def self.send_message(org, text)
    token = org.settings["telegram_bot_token"]
    chat_id = org.settings["telegram_chat_id"]

    uri = URI("#{API_BASE}/bot#{token}/sendMessage")
    response = Net::HTTP.post_form(uri, {
      chat_id: chat_id,
      text: text,
      parse_mode: "Markdown"
    })

    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error("TelegramNotifier failed: #{response.code} #{response.body}")
    end

    response
  rescue StandardError => e
    Rails.logger.error("TelegramNotifier error: #{e.class} #{e.message}")
  end

  def self.format_price(cents, currency_config)
    value = currency_config[:decimal_places].positive? ?
      (cents / 100.0).round(currency_config[:decimal_places]).to_s :
      (cents / 100).to_s
    currency_config[:symbol_position] == :before ?
      "#{currency_config[:symbol]}#{value}" : "#{value} #{currency_config[:symbol]}"
  end

  def self.status_label(status)
    { "confirmed" => "Подтверждено", "checked_in" => "Заселён",
      "checked_out" => "Выселен", "cancelled" => "Отменено" }[status] || status
  end
end
