import { createI18n } from 'vue-i18n'
import { ru as vuetifyRu, en as vuetifyEn } from 'vuetify/locale'
import ru from '../locales/ru.json'
import en from '../locales/en.json'

export const LOCALE_STORAGE_KEY = 'locale'
const SUPPORTED_LOCALES = ['ru', 'en']

// Read persisted locale before first render so reloads don't flash the default
// locale while /auth/me is in flight. auth.js keeps this key in sync with
// organization.settings.locale after login.
function initialLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  } catch {
    // localStorage may be unavailable (SSR, privacy mode) — fall back to default.
  }
  return 'ru'
}

// $vuetify keys are required by vuetify/locale/adapters/vue-i18n so built-in
// component strings (pagination, no-data, etc.) follow the app locale.
const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'ru',
  messages: {
    ru: { ...ru, $vuetify: vuetifyRu },
    en: { ...en, $vuetify: vuetifyEn },
  },
})

export function setAppLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // persistence is best-effort; runtime locale still switches.
  }
}

export default i18n
