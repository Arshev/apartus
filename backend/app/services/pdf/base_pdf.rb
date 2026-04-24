module Pdf
  class BasePdf
    include Prawn::View

    FONT_DIR = Rails.root.join("app/assets/fonts")

    # Shared between all PDF descendants that support currency-override
    # fallback rendering (FT-038 owner statements, FT-039 financial reports).
    # RU-only literal — backend i18n out of scope (FT-038 REQ-07 / FT-039 REQ-08).
    FALLBACK_NOTICE = "Конвертация недоступна — показано в валюте организации".freeze

    def initialize(organization)
      @organization = organization
      @currency = CurrencyConfig.config_for(organization.currency)
      register_fonts
    end

    private

    def fmt(cents, currency_override: nil)
      cfg = currency_override ? CurrencyConfig.config_for(currency_override) : @currency
      value = cfg[:decimal_places].positive? ?
        (cents / 100.0).round(cfg[:decimal_places]).to_s :
        (cents / 100).to_s
      cfg[:symbol_position] == :before ?
        "#{cfg[:symbol]}#{value}" : "#{value} #{cfg[:symbol]}"
    end

    def register_fonts
      if File.exist?(FONT_DIR.join("Arial.ttf"))
        document.font_families.update(
          "Arial" => {
            normal: FONT_DIR.join("Arial.ttf").to_s,
            bold: FONT_DIR.join("ArialBold.ttf").to_s
          }
        )
        document.font "Arial"
      end
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
