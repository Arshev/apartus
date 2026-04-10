<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Расходы</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Добавить</v-btn>
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
    >
      <template v-slot:item.category="{ item }">
        {{ categoryLabels[item.category] || item.category }}
      </template>
      <template v-slot:item.amount_cents="{ item }">
        {{ (item.amount_cents / 100).toFixed(2) }} ₽
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state v-else-if="!store.loading" icon="mdi-cash-minus" title="Нет расходов" />

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? 'Редактировать' : 'Новый расход' }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.category" label="Категория" :items="categories" item-title="label" item-value="value" class="mb-2" />
          <v-text-field v-model.number="form.amount_cents" label="Сумма (копейки)" type="number" class="mb-2" />
          <v-text-field v-model="form.expense_date" label="Дата" type="date" class="mb-2" />
          <v-textarea v-model="form.description" label="Описание" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">Отмена</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">{{ editing ? 'Сохранить' : 'Создать' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить расход?</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Отмена</v-btn>
          <v-btn color="error" @click="handleDelete">Удалить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useExpensesStore } from '../stores/expenses'

const store = useExpensesStore()

const headers = [
  { title: 'Дата', key: 'expense_date' },
  { title: 'Категория', key: 'category' },
  { title: 'Сумма', key: 'amount_cents' },
  { title: 'Описание', key: 'description' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const categoryLabels = { maintenance: 'Обслуживание', utilities: 'Коммунальные', cleaning: 'Уборка', supplies: 'Расходники', other: 'Прочее' }
const categories = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }))

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ category: 'other', amount_cents: 0, expense_date: '', description: '' })
const formSubmitting = ref(false)
const deleteDialog = ref(false)
const deleting = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function openCreate() {
  editing.value = null
  form.value = { category: 'other', amount_cents: 0, expense_date: new Date().toISOString().slice(0, 10), description: '' }
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { category: item.category, amount_cents: item.amount_cents, expense_date: item.expense_date, description: item.description || '' }
  formDialog.value = true
}

async function handleSubmit() {
  formSubmitting.value = true
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value)
      snackbarText.value = 'Обновлено'
    } else {
      await store.create(form.value)
      snackbarText.value = 'Создано'
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

function confirmDelete(item) { deleting.value = item; deleteDialog.value = true }

async function handleDelete() {
  try {
    await store.destroy(deleting.value.id)
    snackbarText.value = 'Удалено'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch {
    snackbarText.value = store.error || 'Ошибка'
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

onMounted(() => store.fetchAll())

defineExpose({ openCreate, openEdit, handleSubmit, confirmDelete, handleDelete, headers, categoryLabels, editing, form, formSubmitting })
</script>
