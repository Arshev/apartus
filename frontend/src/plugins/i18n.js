import { createI18n } from 'vue-i18n'
import { ru as vuetifyRu, en as vuetifyEn } from 'vuetify/locale'
import ru from '../locales/ru.json'
import en from '../locales/en.json'

// $vuetify keys are required by vuetify/locale/adapters/vue-i18n so built-in
// component strings (pagination, no-data, etc.) follow the app locale.
const i18n = createI18n({
  legacy: false,
  locale: 'ru',
  fallbackLocale: 'ru',
  messages: {
    ru: { ...ru, $vuetify: vuetifyRu },
    en: { ...en, $vuetify: vuetifyEn },
  },
})

export default i18n
