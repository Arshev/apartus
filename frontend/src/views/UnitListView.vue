<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center gap-2 mb-6">
      <RouterLink
        to="/properties"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="$t('common.cancel')"
      >
        <i class="pi pi-arrow-left" aria-hidden="true" />
      </RouterLink>
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('units.title') }}{{ propertyName ? ` — ${propertyName}` : '' }}
      </h1>
      <div class="flex-1" />
      <RouterLink
        :to="`/properties/${propertyId}/units/new`"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('common.add') }}
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
        @click="store.fetchAll(propertyId)"
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
      <Column field="name" :header="$t('units.columns.name')" />
      <Column field="unit_type" :header="$t('units.columns.type')">
        <template #body="{ data }">
          {{ typeLabels[data.unit_type] || data.unit_type }}
        </template>
      </Column>
      <Column field="capacity" :header="$t('units.columns.capacity')" />
      <Column field="status" :header="$t('units.columns.status')">
        <template #body="{ data }">
          {{ statusLabels[data.status] || data.status }}
        </template>
      </Column>
      <Column :header="''" header-style="width: 120px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1">
            <RouterLink
              :to="`/properties/${propertyId}/units/${data.id}/edit`"
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

    <div
      v-else-if="!store.loading && !store.error"
      class="text-center py-16 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
    >
      <i class="pi pi-th-large text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('units.emptyState.title') }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('units.emptyState.text') }}
      </p>
      <RouterLink
        :to="`/properties/${propertyId}/units/new`"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('common.add') }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { useUnitsStore } from '../stores/units'
import { usePropertiesStore } from '../stores/properties'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUnitsStore()
const propertiesStore = usePropertiesStore()
const confirm = useConfirm()
const toast = useToast()

const propertyId = computed(() => route.params.propertyId)

const propertyName = computed(() => {
  const p = propertiesStore.items.find((p) => p.id === Number(propertyId.value))
  return p?.name || null
})

const typeLabels = computed(() => ({
  room: t('units.types.room'),
  apartment: t('units.types.apartment'),
  bed: t('units.types.bed'),
  studio: t('units.types.studio'),
}))

const statusLabels = computed(() => ({
  available: t('units.statuses.available'),
  maintenance: t('units.statuses.maintenance'),
  blocked: t('units.statuses.blocked'),
}))

function confirmDelete(unit) {
  confirm.require({
    message: t('units.dialog.deleteText', { name: unit.name }),
    header: t('units.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(unit),
  })
}

async function handleDelete(unit) {
  try {
    await store.destroy(unit.id)
    toast.add({ severity: 'success', summary: t('units.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.deleteError'),
      life: 3000,
    })
  }
}

onMounted(async () => {
  if (!propertyId.value) {
    router.push('/properties')
    return
  }
  await store.fetchAll(propertyId.value)
})

defineExpose({ confirmDelete, handleDelete, typeLabels, statusLabels, propertyId })
</script>
