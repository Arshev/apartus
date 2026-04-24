module CurrencyConfig
  CURRENCIES = {
    "RUB" => { symbol: "₽", decimal_places: 2, symbol_position: :after, name: "Российский рубль" },
    "USD" => { symbol: "$", decimal_places: 2, symbol_position: :before, name: "US Dollar" },
    "EUR" => { symbol: "€", decimal_places: 2, symbol_position: :before, name: "Euro" },
    "THB" => { symbol: "฿", decimal_places: 2, symbol_position: :before, name: "Thai Baht" },
    "AED" => { symbol: "د.إ", decimal_places: 2, symbol_position: :after, name: "UAE Dirham" },
    "TRY" => { symbol: "₺", decimal_places: 2, symbol_position: :before, name: "Turkish Lira" },
    "KZT" => { symbol: "₸", decimal_places: 2, symbol_position: :after, name: "Казахстанский тенге" },
    "GEL" => { symbol: "₾", decimal_places: 2, symbol_position: :after, name: "Georgian Lari" },
    "UZS" => { symbol: "сўм", decimal_places: 0, symbol_position: :after, name: "Узбекский сум" },
    "GBP" => { symbol: "£", decimal_places: 2, symbol_position: :before, name: "British Pound" },
    "IDR" => { symbol: "Rp", decimal_places: 0, symbol_position: :before, name: "Indonesian Rupiah" }
  }.freeze

  def self.codes
    CURRENCIES.keys
  end

  def self.config_for(code)
    CURRENCIES[code] || CURRENCIES["USD"]
  end

  def self.decimal_places(code)
    config_for(code).fetch(:decimal_places)
  end
end
