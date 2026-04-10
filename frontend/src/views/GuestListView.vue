<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Гости</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="'/guests/new'">Добавить гостя</v-btn>
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
      <template v-slot:item.full_name="{ item }">
        {{ item.first_name }} {{ item.last_name }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" :to="`/guests/${item.id}/edit`" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-account-group-outline"
      title="Нет гостей"
      text="Добавьте первого гостя."
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="'/guests/new'">Добавить гостя</v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить гостя?</v-card-title>
        <v-card-text>
          Гость «{{ deletingGuest?.first_name }} {{ deletingGuest?.last_name }}» будет удалён.
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
import { useGuestsStore } from '../stores/guests'

const store = useGuestsStore()

const headers = [
  { title: 'Имя', key: 'full_name' },
  { title: 'Email', key: 'email' },
  { title: 'Телефон', key: 'phone' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const deleteDialog = ref(false)
const deletingGuest = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

function confirmDelete(guest) {
  deletingGuest.value = guest
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingGuest.value.id)
    snackbarText.value = 'Гость удалён'
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || 'Не удалось удалить'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingGuest.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({ confirmDelete, handleDelete, headers })
</script>
