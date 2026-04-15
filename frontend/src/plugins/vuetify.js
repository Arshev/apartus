import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n'
import { useI18n } from 'vue-i18n'
import i18n from './i18n'

// ── Apartus Design Tokens ──────────────────────────────────────
// Light theme: RentProg-inspired — green primary, white bg, saturated statuses
// Dark theme: Cool dark surfaces with lifted teal + orange accent
// Reservation status colors follow PMS industry standard

const apartusLight = {
  dark: false,
  colors: {
    // Brand — green primary like RentProg, orange accent
    primary: '#43A047',
    'primary-darken-1': '#2E7D32',
    'primary-lighten-1': '#66BB6A',
    secondary: '#FB8C00',
    'secondary-darken-1': '#EF6C00',
    'secondary-lighten-1': '#FFB74D',

    // Semantic
    error: '#E53935',
    warning: '#FB8C00',
    info: '#1E88E5',
    success: '#43A047',

    // Surfaces — clean white, not grey
    background: '#FFFFFF',
    surface: '#FFFFFF',
    'surface-bright': '#FFFFFF',
    'surface-light': '#F5F5F5',
    'surface-variant': '#EEEEEE',
    'on-surface': '#212121',
    'on-surface-variant': '#757575',

    // On-color tokens — white text on all saturated backgrounds
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-error': '#FFFFFF',
    'on-warning': '#FFFFFF',
    'on-info': '#FFFFFF',
    'on-success': '#FFFFFF',

    // Reservation statuses — saturated, not tonal
    'status-confirmed': '#1E88E5',
    'status-checked-in': '#43A047',
    'status-checked-out': '#9E9E9E',
    'status-cancelled': '#E53935',
    'status-pending': '#FB8C00',
    'status-blocked': '#78909C',

    // Task priorities — saturated
    'priority-low': '#78909C',
    'priority-medium': '#1E88E5',
    'priority-high': '#FB8C00',
    'priority-urgent': '#E53935',

    // Finance
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
    // Brand
    primary: '#4DB6AC',
    'primary-darken-1': '#00897B',
    'primary-lighten-1': '#80CBC4',
    secondary: '#FFB74D',
    'secondary-darken-1': '#F57C00',
    'secondary-lighten-1': '#FFE0B2',

    // Semantic
    error: '#EF5350',
    warning: '#FFD54F',
    info: '#42A5F5',
    success: '#66BB6A',

    // Surfaces
    background: '#121418',
    surface: '#1E2128',
    'surface-bright': '#2A2E36',
    'surface-light': '#2A2E36',
    'surface-variant': '#3A3F47',
    'on-surface-variant': '#C4C7CC',

    // Reservation statuses
    'status-confirmed': '#42A5F5',
    'status-checked-in': '#66BB6A',
    'status-checked-out': '#9E9E9E',
    'status-cancelled': '#EF5350',
    'status-pending': '#FFA726',
    'status-blocked': '#90A4AE',

    // Task priorities
    'priority-low': '#90A4AE',
    'priority-medium': '#42A5F5',
    'priority-high': '#FFA726',
    'priority-urgent': '#EF5350',

    // Finance
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
