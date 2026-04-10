<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Удобства</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        Добавить
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
    </v-alert>

    <v-data-table
      v-if="store.items.length || store.loading"
      :headers="headers"
      :items="store.items"
      :loading="store.loading"
      density="comfortable"
      hover
    >
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-star-circle-outline"
      title="Нет удобств"
      text="Создайте первое удобство для каталога организации."
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Добавить</v-btn>
      </template>
    </v-empty-state>

    <!-- Create/Edit dialog -->
    <v-dialog v-model="formDialog" max-width="400">
      <v-card>
        <v-card-title>{{ editingAmenity ? 'Редактировать удобство' : 'Новое удобство' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="formName" label="Название" :rules="[rules.required]" autofocus />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">Отмена</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleFormSubmit">
            {{ editingAmenity ? 'Сохранить' : 'Создать' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить удобство?</v-card-title>
        <v-card-text>
          Удобство «{{ deletingAmenity?.name }}» будет удалено.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Отмена</v-btn>
          <v-btn color="error" @click="handleDelete">Удалить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAmenitiesStore } from '../stores/amenities'

const store = useAmenitiesStore()

const headers = [
  { title: 'Название', key: 'name' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const rules = { required: (v) => !!v || 'Обязательное поле' }

const formDialog = ref(false)
const editingAmenity = ref(null)
const formName = ref('')
const formSubmitting = ref(false)

const deleteDialog = ref(false)
const deletingAmenity = ref(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function openCreate() {
  editingAmenity.value = null
  formName.value = ''
  formDialog.value = true
}

function openEdit(amenity) {
  editingAmenity.value = amenity
  formName.value = amenity.name
  formDialog.value = true
}

async function handleFormSubmit() {
  if (!formName.value.trim()) return
  formSubmitting.value = true
  try {
    if (editingAmenity.value) {
      await store.update(editingAmenity.value.id, { name: formName.value.trim() })
      snackbarText.value = 'Удобство обновлено'
    } else {
      await store.create({ name: formName.value.trim() })
      snackbarText.value = 'Удобство создано'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    formDialog.value = false
  } catch {
    snackbarText.value = store.error || 'Ошибка'
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(amenity) {
  deletingAmenity.value = amenity
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingAmenity.value.id)
    snackbarText.value = 'Удобство удалено'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch {
    snackbarText.value = store.error || 'Не удалось удалить'
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingAmenity.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  openCreate, openEdit, handleFormSubmit, confirmDelete, handleDelete,
  formDialog, editingAmenity, formName, formSubmitting, deleteDialog, deletingAmenity,
  headers, rules,
})
</script>
