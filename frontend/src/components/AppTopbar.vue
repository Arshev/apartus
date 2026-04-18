<template>
  <v-app-bar :extended="authStore.loading" extension-height="2" border="b">
    <v-app-bar-nav-icon @click="$emit('toggleDrawer')" />
    <v-app-bar-title><span class="text-primary font-weight-bold">Apartus</span></v-app-bar-title>
    <v-spacer />

    <v-btn
      :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      variant="text"
      @click="toggleTheme"
    />

    <template v-if="authStore.isAuthenticated">
      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" variant="text">
            <v-icon start>mdi-account</v-icon>
            {{ authStore.user?.full_name }}
            <v-icon end>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item @click="handleLogout" prepend-icon="mdi-logout" :title="$t('topbar.logout')" />
        </v-list>
      </v-menu>
    </template>
    <template v-slot:extension>
      <v-progress-linear v-if="authStore.loading" indeterminate color="primary" height="2" />
    </template>
  </v-app-bar>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '../stores/auth'

defineEmits(['toggleDrawer'])

const router = useRouter()
const authStore = useAuthStore()
const theme = useTheme()

const isDark = computed(() => theme.global.current.value.dark)

const THEME_STORAGE_KEY = 'apartus-theme'
const VALID_THEMES = ['apartusLight', 'apartusDark']

// FT-036 P0: sync document.documentElement.class с Vuetify theme.
// Единый `.dark` class активирует Tailwind `dark:*` utilities +
// PrimeVue `darkModeSelector: '.dark'` (см. plugins/primevue.js).
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
    // Persistence is best-effort (privacy mode / sandboxed iframes throw).
  }
}

// Restore saved theme preference. Reads happen at component setup on every
// mount, so localStorage failures here must not crash the UI.
try {
  const saved = localStorage.getItem(THEME_STORAGE_KEY)
  if (saved && VALID_THEMES.includes(saved)) {
    theme.global.name.value = saved
    syncDarkClass(saved)
  } else {
    // First paint — sync based на Vuetify default.
    syncDarkClass(theme.global.name.value)
  }
} catch {
  // Fall back to default theme.
  syncDarkClass(theme.global.name.value)
}

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}

defineExpose({ handleLogout, toggleTheme, isDark })
</script>
