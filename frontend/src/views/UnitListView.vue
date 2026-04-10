<template>
  <v-container>
    <div class="d-flex align-center mb-2">
      <v-btn variant="text" icon="mdi-arrow-left" :to="'/properties'" />
      <h1 class="text-h4 ml-2">Помещения{{ propertyName ? ` — ${propertyName}` : '' }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="`/properties/${propertyId}/units/new`">
        Добавить
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      <template v-slot:append>
        <v-btn variant="text" size="small" @click="store.fetchAll(propertyId)">Повторить</v-btn>
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
      title="Нет помещений"
      text="Добавьте первое помещение в этот объект."
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="`/properties/${propertyId}/units/new`">
          Добавить
        </v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить помещение?</v-card-title>
        <v-card-text>
          Помещение «{{ deletingUnit?.name }}» будет удалено.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Отмена</v-btn>
          <v-btn color="error" @click="handleDelete">Удалить</v-btn>
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
import { useRoute, useRouter } from 'vue-router'
import { useUnitsStore } from '../stores/units'
import { usePropertiesStore } from '../stores/properties'

const route = useRoute()
const router = useRouter()
const store = useUnitsStore()
const propertiesStore = usePropertiesStore()

const propertyId = computed(() => route.params.propertyId)

const propertyName = computed(() => {
  const p = propertiesStore.items.find((p) => p.id === Number(propertyId.value))
  return p?.name || null
})

const headers = [
  { title: 'Название', key: 'name' },
  { title: 'Тип', key: 'unit_type' },
  { title: 'Вместимость', key: 'capacity' },
  { title: 'Статус', key: 'status' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const typeLabels = { room: 'Комната', apartment: 'Квартира', bed: 'Место', studio: 'Студия' }
const statusLabels = { available: 'Доступен', maintenance: 'Обслуживание', blocked: 'Заблокирован' }

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
    snackbarText.value = 'Помещение удалено'
    snackbar.value = true
  } catch {
    snackbarText.value = store.error || 'Не удалось удалить'
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
