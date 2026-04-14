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
          <v-list-item @click="handleLogout" prepend-icon="mdi-logout" title="Выйти" />
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

function toggleTheme() {
  const next = isDark.value ? 'apartusLight' : 'apartusDark'
  theme.global.name.value = next
  localStorage.setItem('apartus-theme', next)
}

// Restore saved theme preference
const saved = localStorage.getItem('apartus-theme')
if (saved && (saved === 'apartusLight' || saved === 'apartusDark')) {
  theme.global.name.value = saved
}

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}

defineExpose({ handleLogout, toggleTheme, isDark })
</script>
