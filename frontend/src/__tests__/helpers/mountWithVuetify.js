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
  'v-empty-state': {
    name: 'v-empty-state',
    props: ['title', 'text'],
    template: '<div class="v-empty-state-stub">{{ title }} {{ text }}</div>',
  },
  'router-view': passthrough('router-view'),
}

export function mountWithVuetify(component, options = {}) {
  const {
    routes = [{ path: '/', component: { template: '<div/>' } }],
    props = {},
    slots = {},
    global: globalOpts = {},
  } = options

  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({ history: createMemoryHistory(), routes })

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
