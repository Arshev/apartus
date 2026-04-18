import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import PrimeVue, { primeVueConfig } from './plugins/primevue'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import pinia from './plugins/pinia'
import i18n from './plugins/i18n'
import router from './router'
// FT-036 P0: tailwind.css must load first — @layer declaration
// controls cascade order (tailwind, primevue, vuetify, scoped).
import './styles/tailwind.css'
import './styles/fonts.css'
import './styles/global.css'

const app = createApp(App)
app.use(PrimeVue, primeVueConfig)
app.use(ConfirmationService)
app.use(ToastService)
app.use(vuetify)
app.use(pinia)
app.use(i18n)
app.use(router)
app.mount('#app')
