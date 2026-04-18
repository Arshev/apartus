<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5 font-weight-bold">{{ $t('properties.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="'/properties/new'">
        {{ $t('properties.addButton') }}
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      <template v-slot:append>
        <v-btn variant="text" size="small" @click="store.fetchAll()">{{ $t('common.retry') }}</v-btn>
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
      <template v-slot:item.property_type="{ item }">
        <span class="text-medium-emphasis">{{ typeLabels[item.property_type] || item.property_type }}</span>
      </template>
      <template v-slot:item.actions="{ item }">
        <div @click.stop>
          <v-btn
            icon="mdi-door-open"
            variant="text"
            size="small"
            :title="$t('properties.unitsButton')"
            :to="`/properties/${item.id}/units`"
          />
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
      icon="mdi-home-city-outline"
      :title="$t('properties.emptyState.title')"
      :text="$t('properties.emptyState.text')"
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="'/properties/new'">
          {{ $t('properties.addButton') }}
        </v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('properties.dialog.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('properties.dialog.deleteText', { name: deletingProperty?.name }) }}
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
import { useRouter } from 'vue-router'
import { usePropertiesStore } from '../stores/properties'

const { t } = useI18n()
const router = useRouter()
const store = usePropertiesStore()

const headers = computed(() => [
  { title: t('properties.columns.name'), key: 'name' },
  { title: t('properties.columns.address'), key: 'address' },
  { title: t('properties.columns.type'), key: 'property_type' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 120 },
])

const typeLabels = computed(() => ({
  apartment: t('properties.types.apartment'),
  hotel: t('properties.types.hotel'),
  house: t('properties.types.house'),
  hostel: t('properties.types.hostel'),
}))

const deleteDialog = ref(false)
const deletingProperty = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

/** Row click → edit. Action icon wrapper stops propagation so doors/delete work. */
function onRowClick(_event, { item }) {
  if (!item?.id) return
  router.push(`/properties/${item.id}/edit`)
}

function confirmDelete(property) {
  deletingProperty.value = property
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingProperty.value.id)
    snackbarText.value = t('properties.messages.deleted')
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('properties.messages.deleteError')
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingProperty.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({ confirmDelete, handleDelete, headers, typeLabels, deletingProperty, deleteDialog })
</script>

<style scoped>
.list-table :deep(tbody tr) {
  cursor: pointer;
}
</style>
