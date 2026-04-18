// Currency configuration mirroring backend CurrencyConfig.
// Used across all views to format money values from cents.

const CURRENCIES = {
  RUB: { symbol: '₽', decimalPlaces: 2, position: 'after' },
  USD: { symbol: '$', decimalPlaces: 2, position: 'before' },
  EUR: { symbol: '€', decimalPlaces: 2, position: 'before' },
  THB: { symbol: '฿', decimalPlaces: 2, position: 'before' },
  AED: { symbol: 'د.إ', decimalPlaces: 2, position: 'after' },
  TRY: { symbol: '₺', decimalPlaces: 2, position: 'before' },
  KZT: { symbol: '₸', decimalPlaces: 2, position: 'after' },
  GEL: { symbol: '₾', decimalPlaces: 2, position: 'after' },
  UZS: { symbol: 'сўм', decimalPlaces: 0, position: 'after' },
  GBP: { symbol: '£', decimalPlaces: 2, position: 'before' },
  IDR: { symbol: 'Rp', decimalPlaces: 0, position: 'before' },
}

export function formatMoney(cents, currencyCode = 'RUB') {
  if (cents === null || cents === undefined) return '—'
  const config = CURRENCIES[currencyCode] || CURRENCIES.USD
  const value = config.decimalPlaces > 0
    ? (cents / 100).toFixed(config.decimalPlaces)
    : Math.round(cents / 100).toString()

  return config.position === 'before'
    ? `${config.symbol}${value}`
    : `${value} ${config.symbol}`
}

export function centsToUnits(cents) {
  return cents / 100
}

export function unitsToCents(units) {
  return Math.round(units * 100)
}

export function getCurrencySymbol(code) {
  return CURRENCIES[code]?.symbol ?? '$'
}

export const CURRENCY_LIST = Object.entries(CURRENCIES).map(([code, cfg]) => ({
  code,
  label: `${code} (${cfg.symbol})`,
  ...cfg,
}))
