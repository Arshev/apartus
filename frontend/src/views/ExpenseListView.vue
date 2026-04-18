<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('expenses.title') }}
      </h1>
      <div class="flex-1" />
      <Button :label="$t('common.add')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div
      v-if="store.error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span class="flex-1">
        {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      </span>
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
      <Column field="expense_date" :header="$t('expenses.columns.date')" />
      <Column field="category" :header="$t('expenses.columns.category')">
        <template #body="{ data }">{{ categoryLabel(data.category) }}</template>
      </Column>
      <Column field="amount_cents" :header="$t('expenses.columns.amount')">
        <template #body="{ data }">
          <span class="tabular-nums">{{ formatMoney(data.amount_cents, currency) }}</span>
        </template>
      </Column>
      <Column field="description" :header="$t('expenses.columns.description')" />
      <Column :header="''" header-style="width: 120px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1">
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              :title="$t('common.edit')"
              @click="openEdit(data)"
            >
              <i class="pi pi-pencil text-sm" aria-hidden="true" />
            </button>
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
      v-else-if="!store.loading"
      class="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
    >
      <i class="pi pi-money-bill text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h3 class="text-base font-medium text-surface-900 dark:text-surface-100">
        {{ $t('expenses.emptyState.title') }}
      </h3>
    </div>

    <Dialog
      v-model:visible="formDialog"
      :header="editing ? $t('expenses.editTitle') : $t('expenses.createTitle')"
      modal
      :style="{ width: '500px' }"
    >
      <div class="space-y-3">
        <div>
          <label for="exp-cat" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('expenses.form.category') }}
          </label>
          <Select
            id="exp-cat"
            v-model="form.category"
            :options="categories"
            option-label="label"
            option-value="value"
            class="w-full"
            :invalid="!!fieldErrors.category"
          />
          <p v-if="fieldErrors.category" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ $t(fieldErrors.category) }}
          </p>
        </div>
        <div>
          <label for="exp-amt" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('expenses.form.amount') }}
          </label>
          <InputText
            id="exp-amt"
            v-model.number="form.amount_rub"
            type="number"
            step="0.01"
            class="w-full"
            :invalid="!!fieldErrors.amount_cents"
          />
          <p v-if="fieldErrors.amount_cents" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ $t(fieldErrors.amount_cents) }}
          </p>
        </div>
        <div>
          <label for="exp-date" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('expenses.form.date') }}
          </label>
          <InputText
            id="exp-date"
            v-model="form.expense_date"
            type="date"
            class="w-full"
            :invalid="!!fieldErrors.expense_date"
          />
          <p v-if="fieldErrors.expense_date" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ $t(fieldErrors.expense_date) }}
          </p>
        </div>
        <div>
          <label for="exp-desc" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('expenses.form.description') }}
          </label>
          <Textarea id="exp-desc" v-model="form.description" rows="2" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="formDialog = false" />
        <Button
          :label="editing ? $t('common.save') : $t('common.add')"
          :loading="formSubmitting"
          @click="handleSubmit"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { formatMoney } from '../utils/currency'
import { useExpensesStore } from '../stores/expenses'
import { useAuthStore } from '../stores/auth'
import { expenseSchema, EXPENSE_CATEGORIES, validate } from '../schemas/expense'

const { t } = useI18n()
const store = useExpensesStore()
const authStore = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const currency = computed(() => authStore.organization?.currency || 'RUB')

function categoryLabel(cat) {
  return EXPENSE_CATEGORIES.includes(cat) ? t(`expenses.categories.${cat}`) : cat
}

const categories = computed(() =>
  EXPENSE_CATEGORIES.map((value) => ({ value, label: t(`expenses.categories.${value}`) })),
)

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ category: 'other', amount_rub: 0, expense_date: '', description: '' })
const fieldErrors = ref({})
const formSubmitting = ref(false)

function openCreate() {
  editing.value = null
  form.value = {
    category: 'other',
    amount_rub: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    description: '',
  }
  fieldErrors.value = {}
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    category: item.category,
    amount_rub: (item.amount_cents || 0) / 100,
    expense_date: item.expense_date,
    description: item.description || '',
  }
  fieldErrors.value = {}
  formDialog.value = true
}

async function handleSubmit() {
  const payload = {
    category: form.value.category,
    amount_cents: Math.round((form.value.amount_rub || 0) * 100),
    expense_date: form.value.expense_date,
    description: form.value.description,
  }
  const { valid, errors } = validate(expenseSchema, payload)
  fieldErrors.value = errors
  if (!valid) return

  formSubmitting.value = true
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload)
    } else {
      await store.create(payload)
    }
    toast.add({ severity: 'success', summary: t('common.messages.saved'), life: 3000 })
    formDialog.value = false
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.error'),
      life: 3000,
    })
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(item) {
  confirm.require({
    message: t('expenses.dialog.deleteText', { category: categoryLabel(item.category) }),
    header: t('expenses.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(item),
  })
}

async function handleDelete(item) {
  try {
    await store.destroy(item.id)
    toast.add({ severity: 'success', summary: t('common.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.error'),
      life: 3000,
    })
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  openCreate, openEdit, handleSubmit, confirmDelete, handleDelete,
  categoryLabel, categories, editing, form, fieldErrors, formSubmitting,
  formatMoney, currency,
})
</script>
