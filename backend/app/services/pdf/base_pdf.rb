module Pdf
  class BasePdf
    include Prawn::View

    def initialize(organization)
      @organization = organization
      @currency = CurrencyConfig.config_for(organization.currency)
    end

    private

    def fmt(cents)
      value = @currency[:decimal_places].positive? ?
        (cents / 100.0).round(@currency[:decimal_places]).to_s :
        (cents / 100).to_s
      @currency[:symbol_position] == :before ?
        "#{@currency[:symbol]}#{value}" : "#{value} #{@currency[:symbol]}"
    end

    def header(title)
      text "Apartus", size: 10, color: "999999"
      text @organization.name, size: 14, style: :bold
      move_down 5
      text title, size: 18, style: :bold
      move_down 15
    end
  end
end
