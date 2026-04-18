import { createI18n } from 'vue-i18n'
import ru from '../locales/ru.json'
import en from '../locales/en.json'

export const LOCALE_STORAGE_KEY = 'locale'
const SUPPORTED_LOCALES = ['ru', 'en']

// Read persisted locale before first render so reloads don't flash the default
// locale while /auth/me is in flight. auth.js re-syncs this key inside
// fetchCurrentUser() once the boot payload arrives.
function initialLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  } catch {
    // localStorage throws in privacy mode or sandboxed iframes — fall back to default.
  }
  return 'ru'
}

// FT-036 P7: Vuetify locale adapter removed (stack migrated to PrimeVue).
const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'ru',
  messages: { ru, en },
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
