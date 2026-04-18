// FT-036 P0: PrimeVue 4 plugin с Aura preset.
//
// Aura owns: primary scale, surface scale, semantic success/info/warn/danger.
// Non-Aura tokens (status/priority/finance) — в Tailwind @theme (см. tailwind.css).
//
// Dark mode selector = `.dark` class на <html> — совпадает с Tailwind
// custom-variant. Единый toggle в composables/useTheme.js.

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import { definePreset } from '@primevue/themes'

// Apartus OKLCH-derived primary green (matches FT-026 vuetify.js #3b9555).
// Aura interpolates 50..950 scale; we override key stops для сохранения
// точного brand hue.
const ApartusPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e9f3ec',
      100: '#c9e1d0',
      200: '#a4cead',
      300: '#7dbc8a',
      400: '#53be70',  // oklch(72% 0.15 150) — FT-026 primary-lighten-1
      500: '#3b9555',  // oklch(60% 0.13 150) — FT-026 primary
      600: '#2d8146',  // between primary и darken
      700: '#007329',  // oklch(48% 0.15 150) — FT-026 primary-darken-1
      800: '#005a21',
      900: '#003f17',
      950: '#00280d',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#fafdfa',
          100: '#f2f6f3',
          200: '#e8ede8',
          300: '#d0d5d1',
          400: '#a5aaa6',
          500: '#7a807c',
          600: '#5f6561',
          700: '#4a5048',
          800: '#35392f',
          900: '#24271f',
          950: '#171c19',
        },
      },
      dark: {
        surface: {
          0: '#e1e6e2',
          50: '#c7ccc8',
          100: '#b9c0bb',
          200: '#9ea59f',
          300: '#7a807c',
          400: '#5a5f5b',
          500: '#464b47',
          600: '#323d3e',
          700: '#1d2929',
          800: '#111a1b',
          900: '#091111',
          950: '#040707',
        },
      },
    },
  },
})

export const primeVueConfig = {
  theme: {
    preset: ApartusPreset,
    options: {
      // Dark mode через class="dark" на <html> — единый toggle с Tailwind.
      darkModeSelector: '.dark',
      // CSS layer интеграция — matches order в tailwind.css:
      // tailwind → primevue → vuetify → scoped.
      cssLayer: {
        name: 'primevue',
        order: 'tailwind, primevue, vuetify, scoped',
      },
    },
  },
  ripple: false, // Tailwind-first aesthetic
}

export default PrimeVue
