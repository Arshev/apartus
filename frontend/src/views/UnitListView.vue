<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <v-btn variant="text" icon="mdi-arrow-left" :to="'/properties'" :aria-label="$t('common.back', 'Back')" />
      <h1 class="text-h5 font-weight-bold ml-2">
        {{ $t('units.title') }}<span v-if="propertyName" class="text-medium-emphasis"> — {{ propertyName }}</span>
      </h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="`/properties/${propertyId}/units/new`">
        {{ $t('common.add') }}
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      <template v-slot:append>
        <v-btn variant="text" size="small" @click="store.fetchAll(propertyId)">{{ $t('common.retry') }}</v-btn>
      </template>
    </v-alert>

    <v-data-table
      v-if="store.items.length || store.loading"
      :headers="headers"
      :items="store.items"
      :loading="store.loading"
      density="comfortable"
      hover
      class="list-table"
      @click:row="onRowClick"
    >
      <template v-slot:item.unit_type="{ item }">
        <span class="text-medium-emphasis">{{ typeLabels[item.unit_type] || item.unit_type }}</span>
      </template>
      <template v-slot:item.capacity="{ item }">
        <span class="text-tabular">{{ item.capacity }}</span>
      </template>
      <template v-slot:item.status="{ item }">
        <v-chip
          :color="statusColor(item.status)"
          size="small"
          variant="tonal"
          density="comfortable"
          class="list-table__chip"
        >
          <span
            class="list-table__chip-dot"
            :style="{ background: `rgb(var(--v-theme-${statusColor(item.status)}))` }"
          />
          {{ statusLabels[item.status] || item.status }}
        </v-chip>
      </template>
      <template v-slot:item.actions="{ item }">
        <div @click.stop>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="error"
            :aria-label="$t('common.delete')"
            @click="confirmDelete(item)"
          />
        </div>
      </template>
    </v-data-table>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-door-open"
      :title="$t('units.emptyState.title')"
      :text="$t('units.emptyState.text')"
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="`/properties/${propertyId}/units/new`">
          {{ $t('common.add') }}
        </v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('units.dialog.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('units.dialog.deleteText', { name: deletingUnit?.name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUnitsStore } from '../stores/units'
import { usePropertiesStore } from '../stores/properties'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUnitsStore()
const propertiesStore = usePropertiesStore()

const propertyId = computed(() => route.params.propertyId)

const propertyName = computed(() => {
  const p = propertiesStore.items.find((p) => p.id === Number(propertyId.value))
  return p?.name || null
})

const headers = computed(() => [
  { title: t('units.columns.name'), key: 'name' },
  { title: t('units.columns.type'), key: 'unit_type' },
  { title: t('units.columns.capacity'), key: 'capacity', align: 'end' },
  { title: t('units.columns.status'), key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 80 },
])

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

// Status → theme color. success for normal operation, warning for maintenance,
// status-blocked (neutral grey) for intentionally-unavailable.
const statusColors = {
  available: 'success',
  maintenance: 'warning',
  blocked: 'status-blocked',
}
function statusColor(s) { return statusColors[s] || 'status-blocked' }

const deleteDialog = ref(false)
const deletingUnit = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

function onRowClick(_event, { item }) {
  if (!item?.id) return
  router.push(`/properties/${propertyId.value}/units/${item.id}/edit`)
}

function confirmDelete(unit) {
  deletingUnit.value = unit
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingUnit.value.id)
    snackbarText.value = t('units.messages.deleted')
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.deleteError')
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingUnit.value = null
  }
}

onMounted(async () => {
  if (!propertyId.value) {
    router.push('/properties')
    return
  }
  await store.fetchAll(propertyId.value)
})

defineExpose({
  confirmDelete, handleDelete, headers, typeLabels, statusLabels, statusColor,
  propertyId, deletingUnit, deleteDialog,
})
</script>

<style scoped>
.list-table :deep(tbody tr) {
  cursor: pointer;
}

.list-table__chip :deep(.v-chip__content) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.list-table__chip-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.text-tabular {
  font-variant-numeric: tabular-nums;
}
</style>
