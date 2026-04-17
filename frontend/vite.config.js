import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    // FT-026: `styles.configFile` points Vuetify's SASS entry at our
    // overrides (Geologica/Geist font families, border radii, etc).
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
