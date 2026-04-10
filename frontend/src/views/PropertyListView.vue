<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Объекты</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="'/properties/new'">
        Добавить объект
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      <template v-slot:append>
        <v-btn variant="text" size="small" @click="store.fetchAll()">Повторить</v-btn>
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
      <template v-slot:item.property_type="{ item }">
        {{ typeLabels[item.property_type] || item.property_type }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-door" variant="text" size="small" title="Помещения" :to="`/properties/${item.id}/units`" />
        <v-btn icon="mdi-pencil" variant="text" size="small" :to="`/properties/${item.id}/edit`" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-home-city-outline"
      title="Нет объектов"
      text="Добавьте первый объект недвижимости."
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="'/properties/new'">
          Добавить объект
        </v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить объект?</v-card-title>
        <v-card-text>
          Объект «{{ deletingProperty?.name }}» будет удалён. Это действие необратимо.
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
import { ref, onMounted } from 'vue'
import { usePropertiesStore } from '../stores/properties'

const store = usePropertiesStore()

const headers = [
  { title: 'Название', key: 'name' },
  { title: 'Адрес', key: 'address' },
  { title: 'Тип', key: 'property_type' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const typeLabels = {
  apartment: 'Квартира',
  hotel: 'Отель',
  house: 'Дом',
  hostel: 'Хостел',
}

const deleteDialog = ref(false)
const deletingProperty = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

function confirmDelete(property) {
  deletingProperty.value = property
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingProperty.value.id)
    snackbarText.value = 'Объект удалён'
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || 'Не удалось удалить объект'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingProperty.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({ confirmDelete, handleDelete, headers, typeLabels })
</script>
