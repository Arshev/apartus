module Pdf
  class OwnerStatementPdf < BasePdf
    def initialize(organization, data)
      super(organization)
      @data = data
    end

    def render_pdf
      header("Акт собственника")
      text "Собственник: #{@data[:owner_name]}", size: 12
      text "Период: #{@data[:from]} — #{@data[:to]}", size: 11
      text "Комиссия: #{(@data[:commission_rate] / 100.0).round(1)}%", size: 11
      move_down 15

      # Summary
      table([
        ["Выручка", fmt(@data[:total_revenue])],
        ["Комиссия УК", fmt(@data[:commission])],
        ["Расходы", fmt(@data[:total_expenses])],
        ["К выплате", fmt(@data[:net_payout])],
      ], width: bounds.width, cell_style: { size: 12, padding: 10 })

      move_down 20

      # Per property
      if @data[:properties]&.any?
        text "Детализация по объектам", size: 14, style: :bold
        move_down 10
        rows = @data[:properties].map do |p|
          [p[:property_name], fmt(p[:revenue]), fmt(p[:commission]), fmt(p[:expenses]), fmt(p[:payout])]
        end
        table(
          [["Объект", "Выручка", "Комиссия", "Расходы", "К выплате"]] + rows,
          width: bounds.width, header: true,
          cell_style: { size: 9, padding: 5 }
        )
      end

      move_down 30
      text "Дата формирования: #{Date.current}", size: 9, color: "999999"

      document.render
    end
  end
end
