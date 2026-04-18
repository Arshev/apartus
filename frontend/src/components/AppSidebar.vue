<template>
  <!-- FT-036 P1 hybrid: v-navigation-drawer outer preserves Vuetify layout
       injection for hybrid phase. Inner = PrimeVue + Tailwind. -->
  <v-navigation-drawer
    :model-value="modelValue"
    width="256"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="h-full flex flex-col">
      <!-- Organization switcher (authenticated) -->
      <button
        v-if="authStore.isAuthenticated"
        ref="orgBtn"
        type="button"
        class="flex items-center gap-3 px-3 py-3 mx-2 mt-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-haspopup="true"
        @click="toggleOrgMenu"
      >
        <i class="pi pi-building text-primary-500" aria-hidden="true" />
        <div class="flex-1 min-w-0 text-left">
          <div class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
            {{ authStore.organization?.name || $t('nav.selectOrganization') }}
          </div>
          <div class="text-xs text-surface-500 dark:text-surface-400">
            {{ $t('nav.organization') }}
          </div>
        </div>
        <i class="pi pi-chevron-down text-xs opacity-60" aria-hidden="true" />
      </button>
      <div v-else class="flex items-center gap-3 px-3 py-3 mx-2 mt-2">
        <i class="pi pi-home text-primary-500" aria-hidden="true" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-surface-900 dark:text-surface-100">Apartus</div>
          <div class="text-xs text-surface-500 dark:text-surface-400">PMS</div>
        </div>
      </div>

      <Menu ref="orgMenu" :model="orgMenuItems" :popup="true" />

      <div class="my-2 mx-2 h-px bg-surface-200 dark:bg-surface-700" />

      <!-- Nav items -->
      <nav class="flex-1 overflow-y-auto px-2 space-y-0.5" :aria-label="$t('nav.mainMenu')">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          active-class="bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
          :exact-active-class="item.to === '/' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''"
          :aria-current="isActive(item) ? 'page' : undefined"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <i :class="['pi', item.icon, 'text-base']" aria-hidden="true" />
          <span>{{ item.title }}</span>
        </RouterLink>
      </nav>
    </div>
  </v-navigation-drawer>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Menu from 'primevue/menu'

defineProps({
  modelValue: Boolean,
})

defineEmits(['update:modelValue'])

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// Nav items — icon keys = PrimeIcons (pi-*). Migration mapping in spec REQ-06.
const navItems = computed(() => [
  { title: t('nav.home'), icon: 'pi-home', to: '/' },
  { title: t('nav.reservations'), icon: 'pi-calendar-check', to: '/reservations' },
  { title: t('nav.calendar'), icon: 'pi-calendar', to: '/calendar' },
  { title: t('nav.guests'), icon: 'pi-users', to: '/guests' },
  { title: t('nav.properties'), icon: 'pi-building', to: '/properties' },
  { title: t('nav.owners'), icon: 'pi-id-card', to: '/owners' },
  { title: t('nav.channels'), icon: 'pi-arrows-h', to: '/channels' },
  { title: t('nav.tasks'), icon: 'pi-check-square', to: '/tasks' },
  { title: t('nav.expenses'), icon: 'pi-money-bill', to: '/expenses' },
  { title: t('nav.reports'), icon: 'pi-chart-bar', to: '/reports' },
  { title: t('nav.amenities'), icon: 'pi-star', to: '/amenities' },
  { title: t('nav.branches'), icon: 'pi-sitemap', to: '/branches' },
  { title: t('nav.settings'), icon: 'pi-cog', to: '/settings' },
])

function isActive(item) {
  if (item.to === '/') return route.path === '/'
  return route.path === item.to || route.path.startsWith(item.to + '/')
}

// Organization switcher menu
const orgMenu = ref(null)

const orgMenuItems = computed(() => [
  ...authStore.organizations.map((org) => ({
    label: org.name,
    icon: 'pi pi-building',
    class: org.id === authStore.organization?.id ? 'font-medium text-primary-600' : '',
    command: () => switchOrg(org),
  })),
])

function toggleOrgMenu(event) {
  orgMenu.value?.toggle(event)
}

async function switchOrg(org) {
  await authStore.switchOrganization(org)
  router.push('/')
}

defineExpose({ navItems, orgMenuItems, switchOrg, toggleOrgMenu, isActive })
</script>
