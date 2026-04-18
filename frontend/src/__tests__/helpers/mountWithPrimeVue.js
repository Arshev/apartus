// FT-036 P0: Test helper для PrimeVue views.
//
// Mirrors mountWithVuetify signature: per-suite mount (без global mocks
// per testing-policy.md), plugins array [pinia, router, i18n, PrimeVue]
// with Aura preset.
//
// Stub strategy (per P0 REQ-08, reviewer I4):
// - Stubbed by default: overlay/teleport-based components (jsdom layout
//   limitations — PrimeVue overlays position via getBoundingClientRect).
// - Real: simple interactive primitives (Button, InputText, InputNumber,
//   Textarea, Checkbox, Card, Divider).

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createVuetify } from 'vuetify'
import PrimeVue, { primeVueConfig } from '../../plugins/primevue'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import i18n from '../../plugins/i18n'

// FT-036 P1: include Vuetify plugin для hybrid views (AppTopbar,
// AppSidebar используют v-app-bar / v-navigation-drawer shells
// даже после P1). Individual Vuetify components stubbed below.
// Themes configured с apartusLight/apartusDark names so useTheme()
// based code (theme.global.current.value.dark) работает в tests.
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'apartusLight',
    themes: {
      apartusLight: { dark: false, colors: {} },
      apartusDark: { dark: true, colors: {} },
    },
  },
})

// Pass-through template copies slot children + activator slot contents
// так, что wrapper.text() и wrapper.find() продолжают работать.
const passthrough = (tag) => ({
  name: tag,
  inheritAttrs: false,
  props: ['modelValue', 'visible'],
  emits: ['update:modelValue', 'update:visible'],
  template: `<div data-stub="${tag}">
    <slot name="activator" :props="{}" />
    <slot name="header" />
    <slot name="footer" />
    <slot />
  </div>`,
})

// Stubs для PrimeVue overlays + popups + teleport-heavy components.
// Buttons/inputs/cards/divider — real (rendered).
export const PRIMEVUE_STUBS = {
  Menu: passthrough('p-menu'),
  ContextMenu: passthrough('p-context-menu'),
  Menubar: passthrough('p-menubar'),
  OverlayPanel: passthrough('p-overlay-panel'),
  Popover: passthrough('p-popover'),
  ConfirmDialog: passthrough('p-confirm-dialog'),
  ConfirmPopup: passthrough('p-confirm-popup'),
  Dialog: passthrough('p-dialog'),
  Drawer: passthrough('p-drawer'),
  Toast: passthrough('p-toast'),
  DatePicker: {
    name: 'DatePicker',
    props: ['modelValue', 'selectionMode', 'dateFormat'],
    emits: ['update:modelValue'],
    template: '<div data-stub="p-date-picker"></div>',
  },
  AutoComplete: {
    name: 'AutoComplete',
    props: ['modelValue', 'suggestions', 'optionLabel'],
    emits: ['update:modelValue', 'complete'],
    template: '<div data-stub="p-autocomplete"></div>',
  },
  Select: {
    name: 'Select',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue'],
    emits: ['update:modelValue'],
    template: '<div data-stub="p-select"></div>',
  },
  MultiSelect: {
    name: 'MultiSelect',
    props: ['modelValue', 'options'],
    emits: ['update:modelValue'],
    template: '<div data-stub="p-multiselect"></div>',
  },
  Tooltip: passthrough('p-tooltip'),
  ConfirmDialog: passthrough('p-confirm-dialog'),
  Toast: passthrough('p-toast'),
  DataTable: {
    name: 'DataTable',
    props: ['value', 'loading', 'size', 'stripedRows', 'dataKey'],
    // Simplified stub: don't iterate rows — tests check logic, not PrimeVue
    // rendering. Actual iteration tests should use integration/e2e.
    template: '<div data-stub="p-datatable"><slot /></div>',
  },
  Column: {
    name: 'Column',
    props: ['field', 'header', 'headerStyle'],
    template: '<div data-stub="p-column" :data-field="field" />',
  },
  Tree: {
    name: 'Tree',
    props: ['value', 'selectionMode'],
    template: `<div data-stub="p-tree">
      <slot />
    </div>`,
  },
}

// FT-036 P1: Vuetify shell stubs — only components still used by hybrid
// P1 shells (v-app-bar в AppTopbar, v-navigation-drawer в AppSidebar,
// v-app wrapper в DefaultLayout). Pass-through templates preserve
// children visibility via wrapper.text()/find().
export const VUETIFY_SHELL_STUBS = {
  'v-app': passthrough('v-app'),
  'v-app-bar': {
    name: 'v-app-bar',
    props: ['extended', 'extensionHeight'],
    template: `<div class="v-app-bar" data-stub="v-app-bar" data-height="64">
      <slot name="default" />
      <slot />
      <slot name="extension" />
    </div>`,
  },
  'v-app-bar-nav-icon': passthrough('v-app-bar-nav-icon'),
  'v-navigation-drawer': {
    name: 'v-navigation-drawer',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `<div class="v-navigation-drawer" data-stub="v-navigation-drawer" data-width="256">
      <slot />
    </div>`,
  },
  'v-main': passthrough('v-main'),
  'v-spacer': passthrough('v-spacer'),
  'v-progress-linear': {
    name: 'v-progress-linear',
    template: '<div data-stub="v-progress-linear" />',
  },
}

export function mountWithPrimeVue(component, options = {}) {
  const { wrapper } = _buildMount(component, options)
  return wrapper
}

export async function mountWithPrimeVueAsync(component, options = {}) {
  const {
    routes = [{ path: '/', component: { template: '<div/>' } }],
    props = {},
    slots = {},
    global: globalOpts = {},
    initialRoute = null,
  } = options

  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(initialRoute || undefined),
    routes,
  })
  if (initialRoute) {
    router.push(initialRoute)
    await router.isReady()
  }

  return mount(component, {
    props,
    slots,
    attachTo: document.body,
    global: {
      plugins: [[PrimeVue, primeVueConfig], ConfirmationService, ToastService, vuetify, pinia, router, i18n],
      stubs: { ...PRIMEVUE_STUBS, ...VUETIFY_SHELL_STUBS, ...(globalOpts.stubs || {}) },
      ...globalOpts,
    },
  })
}

function _buildMount(component, options = {}) {
  const {
    routes = [{ path: '/', component: { template: '<div/>' } }],
    props = {},
    slots = {},
    global: globalOpts = {},
    initialRoute = null,
  } = options

  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(initialRoute || undefined),
    routes,
  })
  if (initialRoute) router.push(initialRoute)

  const wrapper = mount(component, {
    props,
    slots,
    attachTo: document.body,
    global: {
      plugins: [[PrimeVue, primeVueConfig], ConfirmationService, ToastService, vuetify, pinia, router, i18n],
      stubs: { ...PRIMEVUE_STUBS, ...VUETIFY_SHELL_STUBS, ...(globalOpts.stubs || {}) },
      ...globalOpts,
    },
  })
  return { wrapper, router }
}
