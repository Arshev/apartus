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
import PrimeVue, { primeVueConfig } from '../../plugins/primevue'
import i18n from '../../plugins/i18n'

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
      plugins: [[PrimeVue, primeVueConfig], pinia, router, i18n],
      stubs: { ...PRIMEVUE_STUBS, ...(globalOpts.stubs || {}) },
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
      plugins: [[PrimeVue, primeVueConfig], pinia, router, i18n],
      stubs: { ...PRIMEVUE_STUBS, ...(globalOpts.stubs || {}) },
      ...globalOpts,
    },
  })
  return { wrapper, router }
}
