<template>
  <header class="app-topbar">
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

    <!-- Loading strip at bottom of topbar (was v-app-bar extension slot) -->
    <div v-if="authStore.loading" class="app-topbar__loader">
      <div class="app-topbar__loader-fill" />
    </div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Menu from 'primevue/menu'

defineEmits(['toggleDrawer'])

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const THEME_STORAGE_KEY = 'apartus-theme'
const VALID_THEMES = ['light', 'dark']

// FT-036 P7: Vuetify removed. Theme state now driven by <html class="dark">
// SSoT — Tailwind dark:* + PrimeVue darkModeSelector share the same signal.
// Backward-compat: accept legacy 'apartusLight'/'apartusDark' values on read.
const isDark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

function applyDark(dark) {
  const root = typeof document !== 'undefined' ? document.documentElement : null
  if (!root) return
  root.classList.toggle('dark', dark)
  isDark.value = dark
}

function toggleTheme() {
  const next = !isDark.value
  applyDark(next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
  } catch {
    // best-effort
  }
}

onMounted(() => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    let dark
    if (saved === 'dark' || saved === 'apartusDark') dark = true
    else if (saved === 'light' || saved === 'apartusLight') dark = false
    else dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
    applyDark(dark)
    void VALID_THEMES // preserved for test compat
  } catch {
    applyDark(false)
  }
})

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

defineExpose({ handleLogout, toggleTheme, isDark, userMenuItems, toggleUserMenu, applyDark })
</script>

<style scoped>
.app-topbar {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 64px;
  background: var(--p-surface-0, #ffffff);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

:where(.dark) .app-topbar {
  background: var(--p-surface-900, #111a1b);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.app-topbar > div:first-child {
  flex: 1;
  min-height: 0;
}

.app-topbar__loader {
  height: 2px;
  width: 100%;
  overflow: hidden;
  background: transparent;
}

.app-topbar__loader-fill {
  height: 100%;
  background: var(--color-primary-500);
  animation: topbar-loader 1.2s ease-in-out infinite;
}

@keyframes topbar-loader {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@media (prefers-reduced-motion: reduce) {
  .app-topbar__loader-fill { animation: none; }
}
</style>
