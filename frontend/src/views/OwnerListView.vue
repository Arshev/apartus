<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ $t('owners.title') }}</h1>
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
      <template v-slot:item.commission_rate="{ item }">
        {{ (item.commission_rate / 100).toFixed(1) }}%
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn size="x-small" variant="text" color="primary" :to="`/owners/${item.id}/statement`">{{ $t('owners.reportButton') }}</v-btn>
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state v-else-if="!store.loading" icon="mdi-account-key" :title="$t('owners.emptyState.title')" />

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? $t('owners.editTitle') : $t('owners.createTitle') }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.name" :label="$t('owners.form.name')" class="mb-2" />
          <v-text-field v-model="form.email" :label="$t('owners.form.email')" class="mb-2" />
          <v-text-field v-model="form.phone" :label="$t('owners.form.phone')" class="mb-2" />
          <v-text-field v-model.number="form.commission_pct" :label="$t('owners.form.commissionPct')" type="number" step="0.1" class="mb-2" />
          <v-select
            v-model="form.preferred_currency"
            :label="$t('owners.form.preferredCurrency')"
            :items="preferredCurrencyOptions"
            item-title="title"
            item-value="value"
            class="mb-2"
          />
          <v-textarea v-model="form.notes" :label="$t('owners.form.notes')" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">{{ editing ? $t('common.save') : $t('common.create') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('owners.dialog.deleteTitle') }}</v-card-title>
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
import { useOwnersStore } from '../stores/owners'
import { CURRENCY_LIST } from '../utils/currency'

const { t } = useI18n()
const store = useOwnersStore()

const preferredCurrencyOptions = computed(() => [
  { title: t('owners.form.preferredCurrencyAuto'), value: null },
  ...CURRENCY_LIST.map((c) => ({ title: c.label, value: c.code })),
])

const headers = computed(() => [
  { title: t('owners.columns.name'), key: 'name' },
  { title: t('owners.columns.email'), key: 'email' },
  { title: t('owners.columns.commission'), key: 'commission_rate' },
  { title: t('owners.columns.propertiesCount'), key: 'properties_count' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ name: '', email: '', phone: '', commission_pct: 0, notes: '', preferred_currency: null })
const formSubmitting = ref(false)
const deleteDialog = ref(false)
const deleting = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function openCreate() {
  editing.value = null
  form.value = { name: '', email: '', phone: '', commission_pct: 0, notes: '', preferred_currency: null }
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    name: item.name,
    email: item.email || '',
    phone: item.phone || '',
    commission_pct: (item.commission_rate || 0) / 100,
    notes: item.notes || '',
    preferred_currency: item.preferred_currency || null,
  }
  formDialog.value = true
}

async function handleSubmit() {
  formSubmitting.value = true
  const payload = { ...form.value, commission_rate: Math.round((form.value.commission_pct || 0) * 100) }
  delete payload.commission_pct
  try {
    if (editing.value) { await store.update(editing.value.id, payload) }
    else { await store.create(payload) }
    formDialog.value = false
    snackbarText.value = editing.value ? t('common.messages.updated') : t('common.messages.created')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
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
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

onMounted(() => store.fetchAll())

defineExpose({ headers, openCreate, openEdit, handleSubmit, confirmDelete, handleDelete, editing, form, formSubmitting })
</script>
