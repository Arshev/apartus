<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ $t('expenses.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ $t('common.add') }}</v-btn>
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
        {{ categoryLabel(item.category) }}
      </template>
      <template v-slot:item.amount_cents="{ item }">
        {{ formatMoney(item.amount_cents, authStore.organization?.currency || 'RUB') }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state v-else-if="!store.loading" icon="mdi-cash-minus" :title="$t('expenses.emptyState.title')" />

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? $t('expenses.editTitle') : $t('expenses.createTitle') }}</v-card-title>
        <v-card-text>
          <v-select v-model="form.category" :label="$t('expenses.form.category')" :items="categories" item-title="label" item-value="value" class="mb-2" />
          <v-text-field v-model.number="form.amount_rub" :label="$t('expenses.form.amount')" type="number" step="0.01" class="mb-2" />
          <v-text-field v-model="form.expense_date" :label="$t('expenses.form.date')" type="date" class="mb-2" />
          <v-textarea v-model="form.description" :label="$t('expenses.form.description')" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">{{ editing ? $t('common.save') : $t('common.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('expenses.dialog.deleteTitle') }}</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMoney } from '../utils/currency'
import { useExpensesStore } from '../stores/expenses'
import { useAuthStore } from '../stores/auth'

const { t } = useI18n()
const store = useExpensesStore()
const authStore = useAuthStore()

const headers = computed(() => [
  { title: t('expenses.columns.date'), key: 'expense_date' },
  { title: t('expenses.columns.category'), key: 'category' },
  { title: t('expenses.columns.amount'), key: 'amount_cents' },
  { title: t('expenses.columns.description'), key: 'description' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

const categoryKeys = { maintenance: 'maintenance', utilities: 'utilities', cleaning: 'cleaning', supplies: 'supplies', other: 'other' }
function categoryLabel(cat) { return t(`expenses.categories.${categoryKeys[cat] || 'other'}`) }

const categories = computed(() => [
  { label: t('expenses.categories.maintenance'), value: 'maintenance' },
  { label: t('expenses.categories.utilities'), value: 'utilities' },
  { label: t('expenses.categories.cleaning'), value: 'cleaning' },
  { label: t('expenses.categories.supplies'), value: 'supplies' },
  { label: t('expenses.categories.other'), value: 'other' },
])

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ category: 'other', amount_rub: 0, expense_date: '', description: '' })
const formSubmitting = ref(false)
const deleteDialog = ref(false)
const deleting = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function openCreate() {
  editing.value = null
  form.value = { category: 'other', amount_rub: 0, expense_date: new Date().toISOString().slice(0, 10), description: '' }
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { category: item.category, amount_rub: (item.amount_cents || 0) / 100, expense_date: item.expense_date, description: item.description || '' }
  formDialog.value = true
}

async function handleSubmit() {
  formSubmitting.value = true
  const payload = { ...form.value, amount_cents: Math.round((form.value.amount_rub || 0) * 100) }
  delete payload.amount_rub
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload)
      snackbarText.value = t('common.messages.saved')
    } else {
      await store.create(payload)
      snackbarText.value = t('common.messages.saved')
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    formDialog.value = false
  } catch (e) { console.error(e);
    snackbarText.value = store.error || t('common.messages.error')
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
    snackbarText.value = t('common.messages.deleted')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

onMounted(() => store.fetchAll())

defineExpose({ openCreate, openEdit, handleSubmit, confirmDelete, handleDelete, headers, categoryLabel, editing, form, formSubmitting })
</script>
