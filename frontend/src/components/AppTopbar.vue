<template>
  <v-app-bar elevation="1">
    <v-app-bar-nav-icon @click="$emit('toggleDrawer')" />
    <v-app-bar-title>Apartus</v-app-bar-title>
    <v-spacer />
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
  </v-app-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

defineEmits(['toggleDrawer'])

const router = useRouter()
const authStore = useAuthStore()

async function handleLogout() {
  await authStore.signOut()
  router.push({ name: 'login' })
}
</script>
