import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    // FT-036 P0: Tailwind 4 via CSS-first `@theme` config
    // (no tailwind.config.js — Tailwind v4 recommended pattern).
    tailwindcss(),
    // FT-026: `styles.configFile` points Vuetify's SASS entry at our
    // overrides (Geologica/Geist font families, border radii, etc).
    // FT-036: kept during hybrid phases P0..P6. Removed в P7.
    vuetify({
      autoImport: true,
      styles: {
        configFile: path.resolve(__dirname, 'src/styles/settings.scss'),
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
})
