<template>
  <v-navigation-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" border="e">
    <!-- Organization switcher -->
    <v-menu v-if="authStore.isAuthenticated">
      <template v-slot:activator="{ props }">
        <v-list-item
          v-bind="props"
          :title="authStore.organization?.name || 'Выберите организацию'"
          subtitle="Организация"
          prepend-icon="mdi-domain"
          append-icon="mdi-chevron-down"
          class="py-3 mx-2 mt-1"
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

    <v-divider class="mb-1" />

    <v-list density="compact" nav color="primary" class="px-2">
      <v-list-item
        v-for="item in navItems"
        :key="item.title"
        :prepend-icon="item.icon"
        :title="item.title"
        :to="item.to"
        rounded="lg"
        class="mb-0.5"
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
  { title: 'Главная', icon: 'mdi-view-dashboard', to: '/' },
  { title: 'Бронирования', icon: 'mdi-calendar-check', to: '/reservations' },
  { title: 'Календарь', icon: 'mdi-calendar-month', to: '/calendar' },
  { title: 'Гости', icon: 'mdi-account-group', to: '/guests' },
  { title: 'Объекты', icon: 'mdi-domain', to: '/properties' },
  { title: 'Собственники', icon: 'mdi-account-key', to: '/owners' },
  { title: 'Каналы', icon: 'mdi-swap-horizontal', to: '/channels' },
  { title: 'Задачи', icon: 'mdi-clipboard-check', to: '/tasks' },
  { title: 'Расходы', icon: 'mdi-cash-minus', to: '/expenses' },
  { title: 'Отчёты', icon: 'mdi-chart-bar', to: '/reports' },
  { title: 'Удобства', icon: 'mdi-star-circle', to: '/amenities' },
  { title: 'Филиалы', icon: 'mdi-source-branch', to: '/branches' },
  { title: 'Настройки', icon: 'mdi-cog', to: '/settings' },
]

async function switchOrg(org) {
  await authStore.switchOrganization(org)
  router.push('/')
}

defineExpose({ switchOrg, navItems })
</script>
