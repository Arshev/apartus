import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// FT-036 P7: Vuetify removed. Stack = Vue 3 + PrimeVue 4 + Tailwind 4 + Zod.
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
})
