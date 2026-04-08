<template>
  <v-navigation-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <!-- Organization switcher -->
    <v-menu v-if="authStore.isAuthenticated">
      <template v-slot:activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="authStore.organization?.name || 'Выберите организацию'"
          subtitle="Организация"
          prepend-icon="mdi-domain"
          append-icon="mdi-chevron-down"
          class="py-3"
        />
      </template>
      <v-list>
        <v-list-item
          v-for="org in authStore.organizations"
          :key="org.id"
          :title="org.name"
          :active="org.id === authStore.organization?.id"
          @click="switchOrg(org)"
        />
        <v-divider />
      </v-list>
    </v-menu>
    <v-list-item v-else title="Apartus" subtitle="PMS" class="py-4" />

    <v-divider />

    <v-list density="compact" nav>
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :prepend-icon="item.icon"
        :title="item.title"
        :to="item.to"
      />
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

defineProps({
  modelValue: Boolean,
})

defineEmits(['update:modelValue'])

const router = useRouter()
const authStore = useAuthStore()

const navItems = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/' },
]

function switchOrg(org) {
  authStore.switchOrganization(org)
  router.push('/')
}
</script>
