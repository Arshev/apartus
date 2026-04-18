<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('guests.title') }}
      </h1>
      <div class="flex-1" />
      <RouterLink
        to="/guests/new"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('guests.addButton') }}
      </RouterLink>
    </div>

    <div
      v-if="store.error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span class="flex-1">
        {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      </span>
      <Button
        :label="$t('common.retry')"
        severity="secondary"
        variant="text"
        size="small"
        @click="store.fetchAll()"
      />
    </div>

    <DataTable
      v-if="store.items.length || store.loading"
      :value="store.items"
      :loading="store.loading"
      size="small"
      striped-rows
      data-key="id"
      class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
    >
      <Column field="full_name" :header="$t('guests.columns.name')">
        <template #body="{ data }">
          {{ data.first_name }} {{ data.last_name }}
        </template>
      </Column>
      <Column field="email" :header="$t('guests.columns.email')" />
      <Column field="phone" :header="$t('guests.columns.phone')" />
      <Column :header="''" header-style="width: 120px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1">
            <RouterLink
              :to="`/guests/${data.id}/edit`"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              :title="$t('common.edit')"
            >
              <i class="pi pi-pencil text-sm" aria-hidden="true" />
            </RouterLink>
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              :title="$t('common.delete')"
              @click="confirmDelete(data)"
            >
              <i class="pi pi-trash text-sm" aria-hidden="true" />
            </button>
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Empty state -->
    <div
      v-else-if="!store.loading && !store.error"
      class="text-center py-16 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
    >
      <i class="pi pi-users text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('guests.emptyState.title') }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('guests.emptyState.text') }}
      </p>
      <RouterLink
        to="/guests/new"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('guests.addButton') }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { useGuestsStore } from '../stores/guests'

const { t } = useI18n()
const store = useGuestsStore()
const confirm = useConfirm()
const toast = useToast()

function confirmDelete(guest) {
  confirm.require({
    message: t('guests.dialog.deleteText', {
      firstName: guest.first_name,
      lastName: guest.last_name,
    }),
    header: t('guests.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(guest),
  })
}

async function handleDelete(guest) {
  try {
    await store.destroy(guest.id)
    toast.add({ severity: 'success', summary: t('guests.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.deleteError'),
      life: 3000,
    })
  }
}

onMounted(() => store.fetchAll())

defineExpose({ confirmDelete, handleDelete })
</script>
