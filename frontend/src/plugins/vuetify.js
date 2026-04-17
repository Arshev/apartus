// FT-026: vite-plugin-vuetify's `styles.configFile` option (vite.config.js)
// now drives Vuetify styles through our `src/styles/settings.scss` SASS
// overrides. Previously we imported `vuetify/styles` directly which bypassed
// our body/heading font customizations.
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { useI18n } from 'vue-i18n'
import i18n from './i18n'

// ── Apartus Design Tokens (FT-026: OKLCH-derived neutrals + brand) ────
// Light: subtly green-tinted neutrals (2% chroma toward brand hue 150°)
// Dark: cool blue-green surfaces (not Material black)
// Status / priority / finance tokens are FUNCTIONAL — kept saturated and
// untouched by this refresh per design-style-guide.md.
//
// OKLCH source values precomputed via culori (see feature FT-026 ASM-02).
// Inline comments show `oklch(L% C H)` → hex mapping for future tuning.

const apartusLight = {
  dark: false,
  colors: {
    // Brand — green primary, orange secondary, now in OKLCH-derived hex
    primary: '#3b9555',            // oklch(60% 0.13 150)
    'primary-darken-1': '#007329', // oklch(48% 0.15 150)
    'primary-lighten-1': '#53be70',// oklch(72% 0.15 150)
    secondary: '#e57600',          // oklch(68% 0.17 55)
    'secondary-darken-1': '#cc4c00',// oklch(58% 0.19 52)
    'secondary-lighten-1': '#f99f55',// oklch(78% 0.14 58)

    // Semantic — FUNCTIONAL, unchanged from previous palette
    error: '#E53935',
    warning: '#FB8C00',
    info: '#1E88E5',
    success: '#43A047',

    // Surfaces — subtle green tint in neutrals (OKLCH C=0.003-0.008 @ H=150)
    background: '#fafdfa',         // oklch(99% 0.004 150)
    surface: '#fcfefc',            // oklch(99.5% 0.003 150)
    'surface-bright': '#fcfefc',   // oklch(99.5% 0.003 150)
    'surface-light': '#f2f6f3',    // oklch(97% 0.006 150)
    'surface-variant': '#e8ede8',  // oklch(94% 0.008 150)
    'on-surface': '#171c19',       // oklch(22% 0.010 155)
    'on-surface-variant': '#5f6561',// oklch(50% 0.010 155)

    // On-color tokens — white text on saturated backgrounds
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-error': '#FFFFFF',
    'on-warning': '#FFFFFF',
    'on-info': '#FFFFFF',
    'on-success': '#FFFFFF',

    // Reservation statuses — FUNCTIONAL, saturated, NOT refreshed (per NS-06)
    'status-confirmed': '#1E88E5',
    'status-checked-in': '#43A047',
    'status-checked-out': '#9E9E9E',
    'status-cancelled': '#E53935',
    'status-pending': '#FB8C00',
    'status-blocked': '#78909C',

    // Task priorities — FUNCTIONAL, NOT refreshed
    'priority-low': '#78909C',
    'priority-medium': '#1E88E5',
    'priority-high': '#FB8C00',
    'priority-urgent': '#E53935',

    // Finance — FUNCTIONAL, NOT refreshed
    'finance-revenue': '#43A047',
    'finance-expense': '#E53935',
  },
  variables: {
    'border-color': '#000000',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.04,
    'hover-opacity': 0.04,
    'focus-opacity': 0.12,
    'selected-opacity': 0.08,
    'activated-opacity': 0.12,
    'pressed-opacity': 0.12,
    'dragged-opacity': 0.08,
  },
}

const apartusDark = {
  dark: true,
  colors: {
    // Brand — shifted slightly toward teal for dark (hue 170 vs 150 in light)
    primary: '#51bb9a',             // oklch(72% 0.11 170)
    'primary-darken-1': '#00906f',  // oklch(58% 0.12 170)
    'primary-lighten-1': '#98dfc6', // oklch(85% 0.08 170)
    secondary: '#ff9b50',           // oklch(78% 0.15 55)
    'secondary-darken-1': '#e77412',// oklch(68% 0.17 52)
    'secondary-lighten-1': '#ffbb7b',// oklch(85% 0.12 60)

    // Semantic — FUNCTIONAL, unchanged
    error: '#EF5350',
    warning: '#FFD54F',
    info: '#42A5F5',
    success: '#66BB6A',

    // Surfaces — cool blue-green (hue 200°), not Material black
    background: '#091111',          // oklch(17% 0.012 200)
    surface: '#111a1b',             // oklch(21% 0.014 200)
    'surface-bright': '#1d2929',    // oklch(27% 0.016 200)
    'surface-light': '#1d2929',     // oklch(27% 0.016 200)
    'surface-variant': '#323d3e',   // oklch(35% 0.015 200)
    'on-surface': '#e1e6e2',        // oklch(92% 0.008 155)
    'on-surface-variant': '#b9c0bb',// oklch(80% 0.010 155)

    // Reservation statuses — FUNCTIONAL, NOT refreshed (per NS-06)
    'status-confirmed': '#42A5F5',
    'status-checked-in': '#66BB6A',
    'status-checked-out': '#9E9E9E',
    'status-cancelled': '#EF5350',
    'status-pending': '#FFA726',
    'status-blocked': '#90A4AE',

    // Task priorities — FUNCTIONAL, NOT refreshed
    'priority-low': '#90A4AE',
    'priority-medium': '#42A5F5',
    'priority-high': '#FFA726',
    'priority-urgent': '#EF5350',

    // Finance — FUNCTIONAL, NOT refreshed
    'finance-revenue': '#66BB6A',
    'finance-expense': '#EF5350',
  },
  variables: {
    'border-color': '#FFFFFF',
    'border-opacity': 0.12,
    'high-emphasis-opacity': 0.87,
    'medium-emphasis-opacity': 0.60,
    'disabled-opacity': 0.38,
    'idle-opacity': 0.10,
    'hover-opacity': 0.08,
    'focus-opacity': 0.12,
    'selected-opacity': 0.16,
    'activated-opacity': 0.24,
    'pressed-opacity': 0.16,
    'dragged-opacity': 0.08,
  },
}

export default createVuetify({
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },

  theme: {
    defaultTheme: 'apartusLight',
    themes: {
      apartusLight,
      apartusDark,
    },
    variations: {
      colors: ['primary', 'secondary'],
      lighten: 2,
      darken: 2,
    },
  },

  defaults: {
    // Global
    global: {
      ripple: true,
    },

    // Buttons
    VBtn: {
      variant: 'elevated',
      rounded: 'lg',
      style: 'text-transform: none; letter-spacing: 0; font-weight: 500;',
    },

    // Cards
    VCard: {
      rounded: 'lg',
      elevation: 1,
    },

    // Text fields & inputs
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
    },

    // Data display
    VDataTable: {
      density: 'comfortable',
      hover: true,
    },
    VChip: {
      rounded: 'lg',
    },

    // Navigation
    VNavigationDrawer: {
      elevation: 0,
    },
    VAppBar: {
      elevation: 0,
      flat: true,
    },
    VList: {
      rounded: 'lg',
    },

    // Dialogs
    VDialog: {
      rounded: 'lg',
    },

    // Alerts
    VAlert: {
      rounded: 'lg',
      variant: 'tonal',
    },

    // Snackbar
    VSnackbar: {
      rounded: 'lg',
    },
  },
})
