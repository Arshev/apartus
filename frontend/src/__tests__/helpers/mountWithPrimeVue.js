// FT-036 P7: Test helper for PrimeVue-only stack (Vuetify removed).
//
// Stub strategy: overlay/teleport-based components stubbed (jsdom layout
// limitations — PrimeVue overlays position via getBoundingClientRect).
// Simple interactive primitives (Button, InputText, Textarea, Checkbox)
// mount as-is.

import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import PrimeVue, { primeVueConfig } from '../../plugins/primevue'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
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
  Tabs: {
    name: 'Tabs',
    props: ['value'],
    emits: ['update:value'],
    template: `<div data-stub="p-tabs" :data-active="value">
      <slot />
    </div>`,
  },
  TabList: passthrough('p-tablist'),
  Tab: {
    name: 'Tab',
    props: ['value'],
    template: '<button data-stub="p-tab" :data-value="value"><slot /></button>',
  },
  TabPanels: passthrough('p-tabpanels'),
  TabPanel: {
    name: 'TabPanel',
    props: ['value'],
    template: '<div data-stub="p-tabpanel" :data-value="value"><slot /></div>',
  },
  ProgressBar: {
    name: 'ProgressBar',
    props: ['mode', 'value'],
    template: '<div data-stub="p-progressbar" :data-mode="mode" />',
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
      plugins: [[PrimeVue, primeVueConfig], ConfirmationService, ToastService, pinia, router, i18n],
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
      plugins: [[PrimeVue, primeVueConfig], ConfirmationService, ToastService, pinia, router, i18n],
      stubs: { ...PRIMEVUE_STUBS, ...(globalOpts.stubs || {}) },
      ...globalOpts,
    },
  })
  return { wrapper, router }
}
