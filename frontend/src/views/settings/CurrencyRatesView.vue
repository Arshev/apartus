<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ $t('currencyRates.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
        {{ $t('currencyRates.addOverride') }}
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
    </v-alert>

    <h2 class="text-h6 mt-2 mb-2">{{ $t('currencyRates.apiRatesHeading') }}</h2>
    <v-alert v-if="!store.apiRates.length && !store.loading" type="info" variant="tonal" class="mb-4">
      {{ $t('currencyRates.apiRatesEmpty') }}
    </v-alert>
    <v-data-table
      v-else
      :headers="apiHeaders"
      :items="store.apiRates"
      :loading="store.loading"
      density="comfortable"
      class="mb-6"
    >
      <template #item.rate_x1e10="{ item }">
        {{ store.rateAsMajorUnit(item.rate_x1e10) }}
      </template>
    </v-data-table>

    <h2 class="text-h6 mb-2">{{ $t('currencyRates.manualOverridesHeading') }}</h2>
    <v-alert v-if="!store.manualOverrides.length && !store.loading" type="info" variant="tonal">
      {{ $t('currencyRates.manualOverridesEmpty') }}
    </v-alert>
    <v-data-table
      v-else
      :headers="manualHeaders"
      :items="store.manualOverrides"
      :loading="store.loading"
      density="comfortable"
    >
      <template #item.rate_x1e10="{ item }">
        {{ store.rateAsMajorUnit(item.rate_x1e10) }}
      </template>
      <template #item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editing ? $t('currencyRates.editTitle') : $t('currencyRates.createTitle') }}
        </v-card-title>
        <v-card-text>
          <v-select
            v-model="form.base_currency"
            :label="$t('currencyRates.form.baseCurrency')"
            :items="currencyCodes"
            class="mb-2"
          />
          <v-select
            v-model="form.quote_currency"
            :label="$t('currencyRates.form.quoteCurrency')"
            :items="currencyCodes"
            class="mb-2"
          />
          <v-text-field
            v-model.number="form.rate"
            :label="$t('currencyRates.form.rate')"
            type="number"
            step="0.0001"
            class="mb-2"
          />
          <v-text-field
            v-model="form.effective_date"
            :label="$t('currencyRates.form.effectiveDate')"
            type="date"
            class="mb-2"
          />
          <v-textarea
            v-model="form.note"
            :label="$t('currencyRates.form.note')"
            rows="2"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">
            {{ editing ? $t('common.save') : $t('common.add') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('currencyRates.deleteTitle') }}</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExchangeRatesStore } from '../../stores/exchangeRates'
import { CURRENCY_LIST } from '../../utils/currency'

const { t } = useI18n()
const store = useExchangeRatesStore()

const currencyCodes = CURRENCY_LIST.map((c) => c.code)

const apiHeaders = computed(() => [
  { title: t('currencyRates.table.base'), key: 'base_currency' },
  { title: t('currencyRates.table.quote'), key: 'quote_currency' },
  { title: t('currencyRates.table.rate'), key: 'rate_x1e10' },
  { title: t('currencyRates.table.effectiveDate'), key: 'effective_date' },
])

const manualHeaders = computed(() => [
  { title: t('currencyRates.table.base'), key: 'base_currency' },
  { title: t('currencyRates.table.quote'), key: 'quote_currency' },
  { title: t('currencyRates.table.rate'), key: 'rate_x1e10' },
  { title: t('currencyRates.table.effectiveDate'), key: 'effective_date' },
  { title: t('currencyRates.table.note'), key: 'note' },
  { title: t('currencyRates.table.actions'), key: 'actions', sortable: false },
])

const formDialog = ref(false)
const deleteDialog = ref(false)
const formSubmitting = ref(false)
const editing = ref(null)
const toDelete = ref(null)
const form = ref(defaultForm())

function defaultForm() {
  return {
    base_currency: 'USD',
    quote_currency: 'RUB',
    rate: null,
    effective_date: new Date().toISOString().slice(0, 10),
    note: '',
  }
}

function openCreate() {
  editing.value = null
  form.value = defaultForm()
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    base_currency: item.base_currency,
    quote_currency: item.quote_currency,
    rate: Number(item.rate_x1e10) / 1e10,
    effective_date: item.effective_date,
    note: item.note || '',
  }
  formDialog.value = true
}

function confirmDelete(item) {
  toDelete.value = item
  deleteDialog.value = true
}

async function handleSubmit() {
  formSubmitting.value = true
  try {
    const payload = {
      base_currency: form.value.base_currency,
      quote_currency: form.value.quote_currency,
      rate_x1e10: Math.round(form.value.rate * 1e10),
      effective_date: form.value.effective_date,
      note: form.value.note,
    }
    if (editing.value) {
      await store.updateOverride(editing.value.id, payload)
    } else {
      await store.createOverride(payload)
    }
    formDialog.value = false
  } catch {
    // Error surfaced via store.error
  } finally {
    formSubmitting.value = false
  }
}

async function handleDelete() {
  if (!toDelete.value) return
  await store.deleteOverride(toDelete.value.id)
  deleteDialog.value = false
  toDelete.value = null
}

onMounted(() => {
  store.fetchAll()
})
</script>
