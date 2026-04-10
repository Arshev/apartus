<template>
  <v-container>
    <h1 class="text-h4 mb-2">Здравствуйте, {{ authStore.user?.full_name }}</h1>
    <p class="text-body-1 text-medium-emphasis">{{ authStore.organization?.name }}</p>
  </v-container>
</template>

<script setup>
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
</script>
