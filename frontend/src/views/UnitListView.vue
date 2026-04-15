<template>
  <v-container>
    <div class="d-flex align-center mb-2">
      <v-btn variant="text" icon="mdi-arrow-left" :to="'/properties'" />
      <h1 class="text-h4 ml-2">{{ $t('units.title') }}{{ propertyName ? ` — ${propertyName}` : '' }}</h1>
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
    >
      <template v-slot:item.unit_type="{ item }">
        {{ typeLabels[item.unit_type] || item.unit_type }}
      </template>
      <template v-slot:item.status="{ item }">
        {{ statusLabels[item.status] || item.status }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" :to="`/properties/${propertyId}/units/${item.id}/edit`" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
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
          <v-btn color="error" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
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
  { title: t('units.columns.capacity'), key: 'capacity' },
  { title: t('units.columns.status'), key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
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

const deleteDialog = ref(false)
const deletingUnit = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

function confirmDelete(unit) {
  deletingUnit.value = unit
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingUnit.value.id)
    snackbarText.value = t('units.messages.deleted')
    snackbar.value = true
  } catch (e) { console.error(e);
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

defineExpose({ confirmDelete, handleDelete, headers, typeLabels, statusLabels, propertyId })
</script>
