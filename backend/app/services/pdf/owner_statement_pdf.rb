module Pdf
  class OwnerStatementPdf < BasePdf
    def initialize(organization, data)
      super(organization)
      @data = data
      @display_currency = data[:currency]
      @override = (@display_currency.present? && @display_currency != organization.currency) ? @display_currency : nil
    end

    def render_pdf
      header("Акт собственника")

      if @data[:currency_fallback_reason].present?
        text BasePdf::FALLBACK_NOTICE, size: 10, color: "cc0000"
        move_down 10
      end

      text "Собственник: #{@data[:owner_name]}", size: 12
      text "Период: #{@data[:from]} — #{@data[:to]}", size: 11
      text "Комиссия: #{(@data[:commission_rate] / 100.0).round(1)}%", size: 11
      move_down 15

      # Summary
      table([
        [ "Выручка", money(@data[:total_revenue]) ],
        [ "Комиссия УК", money(@data[:commission]) ],
        [ "Расходы", money(@data[:total_expenses]) ],
        [ "К выплате", money(@data[:net_payout]) ]
      ], width: bounds.width, cell_style: { size: 12, padding: 10 })

      move_down 20

      # Per property
      if @data[:properties]&.any?
        text "Детализация по объектам", size: 14, style: :bold
        move_down 10
        rows = @data[:properties].map do |p|
          [ p[:property_name], money(p[:revenue]), money(p[:commission]), money(p[:expenses]), money(p[:payout]) ]
        end
        table(
          [ [ "Объект", "Выручка", "Комиссия", "Расходы", "К выплате" ] ] + rows,
          width: bounds.width, header: true,
          cell_style: { size: 9, padding: 5 }
        )
      end

      move_down 30
      text "Дата формирования: #{Date.current}", size: 9, color: "999999"

      document.render
    end

    private

    def money(cents)
      fmt(cents, currency_override: @override)
    end
  end
end
