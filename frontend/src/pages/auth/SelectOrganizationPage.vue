<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-surface-50 dark:bg-surface-950">
    <div class="w-full max-w-lg">
      <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-sm">
        <div class="px-6 py-6 border-b border-surface-200 dark:border-surface-700">
          <h1 class="text-center text-xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
            {{ $t('auth.selectOrganization.title') }}
          </h1>
        </div>

        <ul class="px-3 py-3 space-y-1">
          <li v-for="org in authStore.organizations" :key="org.id">
            <button
              type="button"
              class="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              @click="selectOrganization(org)"
            >
              <i class="pi pi-building text-primary-500 text-xl" aria-hidden="true" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                  {{ org.name }}
                </div>
                <div class="text-xs text-surface-500 dark:text-surface-400">
                  {{ org.role }}
                </div>
              </div>
              <i class="pi pi-chevron-right text-surface-400" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function selectOrganization(org) {
  await authStore.switchOrganization(org)
  router.push('/')
}

defineExpose({ selectOrganization })
</script>
