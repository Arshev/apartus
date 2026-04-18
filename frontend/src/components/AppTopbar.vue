<template>
  <!-- FT-036 P1 hybrid: v-app-bar outer shell preserves layout injection
       (v-main content offset). Inner content = PrimeVue + Tailwind. -->
  <v-app-bar :extended="authStore.loading" extension-height="2" border="b" height="64">
    <div class="flex items-center gap-2 px-3 w-full h-full">
      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="$t('topbar.toggleNavigation')"
        @click="$emit('toggleDrawer')"
      >
        <i class="pi pi-bars text-lg" aria-hidden="true" />
      </button>

      <h1 class="text-lg font-display font-semibold tracking-tight text-primary-600 dark:text-primary-400">
        Apartus
      </h1>

      <div class="flex-1" />

      <button
        type="button"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="isDark ? $t('topbar.lightMode') : $t('topbar.darkMode')"
        @click="toggleTheme"
      >
        <i :class="['pi', isDark ? 'pi-sun' : 'pi-moon', 'text-lg']" aria-hidden="true" />
      </button>

      <template v-if="authStore.isAuthenticated">
        <button
          ref="userMenuRef"
          type="button"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-haspopup="true"
          @click="toggleUserMenu"
        >
          <i class="pi pi-user" aria-hidden="true" />
          <span class="text-sm font-medium">{{ authStore.user?.full_name }}</span>
          <i class="pi pi-chevron-down text-xs opacity-60" aria-hidden="true" />
        </button>
        <Menu ref="userMenu" :model="userMenuItems" :popup="true" />
      </template>
    </div>

    <template #extension>
      <div v-if="authStore.loading" class="w-full h-0.5 bg-primary-500 overflow-hidden relative">
        <div class="absolute inset-0 bg-primary-300 animate-pulse" />
      </div>
    </template>
  </v-app-bar>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '../stores/auth'
import Menu from 'primevue/menu'

defineEmits(['toggleDrawer'])

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const theme = useTheme()

const isDark = computed(() => theme.global.current.value.dark)

const THEME_STORAGE_KEY = 'apartus-theme'
const VALID_THEMES = ['apartusLight', 'apartusDark']

// FT-036 P0: sync <html class="dark"> c Vuetify theme.
// Единый class triggers Tailwind dark:* + PrimeVue darkModeSelector.
function syncDarkClass(themeName) {
  const root = typeof document !== 'undefined' ? document.documentElement : null
  if (!root) return
  root.classList.toggle('dark', themeName === 'apartusDark')
}

function toggleTheme() {
  const next = isDark.value ? 'apartusLight' : 'apartusDark'
  theme.global.name.value = next
  syncDarkClass(next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next)
  } catch {
    // best-effort persistence
  }
}

try {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  if (saved && VALID_THEMES.includes(saved)) {
    theme.global.name.value = saved
    syncDarkClass(saved)
  } else {
    syncDarkClass(theme.global.name.value)
  }
} catch {
  syncDarkClass(theme.global.name.value)
}

// User menu (PrimeVue popup)
const userMenu = ref(null)

const userMenuItems = computed(() => [
  {
    label: t('topbar.logout'),
    icon: 'pi pi-sign-out',
    command: () => handleLogout(),
  },
])

function toggleUserMenu(event) {
  userMenu.value?.toggle(event)
}

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}

defineExpose({ handleLogout, toggleTheme, isDark, userMenuItems, toggleUserMenu })
</script>
