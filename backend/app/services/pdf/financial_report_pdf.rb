module Pdf
  class FinancialReportPdf < BasePdf
    def initialize(organization, data)
      super(organization)
      @data = data
    end

    def render_pdf
      header("Финансовый отчёт")
      text "Период: #{@data[:from]} — #{@data[:to]}", size: 11
      move_down 15

      # KPI
      table([
        ["Выручка", fmt(@data[:total_revenue])],
        ["Расходы", fmt(@data[:total_expenses])],
        ["Чистый доход", fmt(@data[:net_income])],
        ["Загрузка", "#{(@data[:occupancy_rate] * 100).round(1)}%"],
        ["ADR", fmt(@data[:adr])],
        ["RevPAR", fmt(@data[:revpar])],
      ], width: bounds.width, cell_style: { size: 11, padding: 8 })

      move_down 20

      # Revenue by property
      if @data[:revenue_by_property]&.any?
        text "Выручка по объектам", size: 14, style: :bold
        move_down 10
        rows = @data[:revenue_by_property].map { |r| [r[:property_name], fmt(r[:revenue])] }
        table([["Объект", "Выручка"]] + rows, width: bounds.width, header: true,
              cell_style: { size: 10, padding: 6 })
        move_down 15
      end

      # Expenses by category
      if @data[:expenses_by_category]&.any?
        text "Расходы по категориям", size: 14, style: :bold
        move_down 10
        rows = @data[:expenses_by_category].map { |e| [e[:category], fmt(e[:total])] }
        table([["Категория", "Сумма"]] + rows, width: bounds.width, header: true,
              cell_style: { size: 10, padding: 6 })
      end

      document.render
    end
  end
end
