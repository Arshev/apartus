import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

// Per-suite mount helper. Не глобальный мок — каждый suite создаёт свой instance
// (`testing-policy.md` запрещает глобальные моки router/Pinia).
//
// Vuetify компоненты замокированы как простые stubs: jsdom не справляется с
// vuetify layout-inject (`v-app-bar`, `v-navigation-drawer` падают на
// "Could not find injected layout"), а наши тесты проверяют логику и template
// нашего кода, а не рендер Vuetify. Stubs пропускают slots, чтобы дочерний
// контент оставался видимым через `wrapper.text()` / `wrapper.find()`.
const passthrough = (tag) => ({
  name: tag,
  inheritAttrs: false,
  template: `<div data-stub="${tag}"><slot name="activator" :props="{}" /><slot /><slot name="extension" /></div>`,
})

export const VUETIFY_STUBS = {
  'v-app': passthrough('v-app'),
  'v-app-bar': passthrough('v-app-bar'),
  'v-app-bar-nav-icon': passthrough('v-app-bar-nav-icon'),
  'v-app-bar-title': passthrough('v-app-bar-title'),
  'v-spacer': passthrough('v-spacer'),
  'v-menu': passthrough('v-menu'),
  'v-btn': passthrough('v-btn'),
  'v-icon': passthrough('v-icon'),
  'v-list': passthrough('v-list'),
  'v-list-item': {
    name: 'v-list-item',
    inheritAttrs: false,
    props: ['title', 'active'],
    emits: ['click'],
    template: '<div class="v-list-item-stub" @click="$emit(\'click\')">{{ title }}<slot /></div>',
  },
  'v-divider': passthrough('v-divider'),
  'v-navigation-drawer': passthrough('v-navigation-drawer'),
  'v-progress-linear': {
    name: 'v-progress-linear',
    template: '<div class="v-progress-linear-stub" />',
  },
  'v-container': passthrough('v-container'),
  'v-row': passthrough('v-row'),
  'v-col': passthrough('v-col'),
  'v-card': passthrough('v-card'),
  'v-card-title': passthrough('v-card-title'),
  'v-card-text': passthrough('v-card-text'),
  'v-card-actions': passthrough('v-card-actions'),
  'v-dialog': passthrough('v-dialog'),
  'v-snackbar': passthrough('v-snackbar'),
  'v-alert': passthrough('v-alert'),
  'v-data-table': {
    name: 'v-data-table',
    props: ['headers', 'items', 'loading', 'density'],
    template: '<div data-stub="v-data-table"><slot /><slot v-for="h in headers" :name="`item.${h.key}`" :item="{}" /></div>',
  },
  'v-form': {
    name: 'v-form',
    template: '<form data-stub="v-form" @submit.prevent><slot /></form>',
    methods: { validate: () => ({ valid: true }) },
  },
  'v-text-field': {
    name: 'v-text-field',
    props: ['modelValue', 'label', 'rules'],
    emits: ['update:modelValue'],
    template: '<div data-stub="v-text-field">{{ label }}</div>',
  },
  'v-select': {
    name: 'v-select',
    props: ['modelValue', 'label', 'items', 'rules', 'clearable', 'loading', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div data-stub="v-select">{{ label }}</div>',
  },
  'v-textarea': {
    name: 'v-textarea',
    props: ['modelValue', 'label', 'rules', 'rows'],
    emits: ['update:modelValue'],
    template: '<div data-stub="v-textarea">{{ label }}</div>',
  },
  'v-empty-state': {
    name: 'v-empty-state',
    props: ['title', 'text'],
    template: '<div class="v-empty-state-stub">{{ title }} {{ text }}</div>',
  },
  'router-view': passthrough('router-view'),
}

// When initialRoute is set, use mountWithVuetifyAsync to await router readiness.
// Sync mountWithVuetify still works for tests that don't need route params.
export function mountWithVuetify(component, options = {}) {
  const { wrapper, router } = _buildMount(component, options)
  return wrapper
}

export async function mountWithVuetifyAsync(component, options = {}) {
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
    global: {
      plugins: [pinia, router],
      stubs: { ...VUETIFY_STUBS, ...(globalOpts.stubs || {}) },
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
    global: {
      plugins: [pinia, router],
      stubs: { ...VUETIFY_STUBS, ...(globalOpts.stubs || {}) },
      ...globalOpts,
    },
  })
  return { wrapper, router }
}
