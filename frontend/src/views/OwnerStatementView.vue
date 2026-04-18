<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center gap-2 mb-6">
      <RouterLink
        to="/owners"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="$t('common.cancel')"
      >
        <i class="pi pi-arrow-left" aria-hidden="true" />
      </RouterLink>
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('owners.statement.title') }}
      </h1>
      <div class="flex-1" />
      <Button
        :label="$t('owners.statement.downloadPdf')"
        icon="pi pi-file-pdf"
        severity="secondary"
        variant="outlined"
        :loading="downloading"
        @click="downloadPdf"
      />
    </div>

    <div v-if="loading" class="h-0.5 bg-primary-500 animate-pulse mb-4" />
    <div
      v-if="error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span>{{ error }}</span>
    </div>

    <template v-if="data">
      <h2 class="text-xl font-display font-medium mb-4 text-surface-900 dark:text-surface-100">
        {{ data.owner_name }}
        <span class="text-sm font-normal text-surface-600 dark:text-surface-400">
          ({{ (data.commission_rate / 100).toFixed(1) }}%)
        </span>
      </h2>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="rounded-lg p-4 bg-green-100 dark:bg-green-950/30 text-center">
          <div class="text-xl font-bold tabular-nums text-green-900 dark:text-green-100">
            {{ fmt(data.total_revenue) }}
          </div>
          <div class="text-xs text-green-800 dark:text-green-300 mt-1">{{ $t('owners.statement.revenue') }}</div>
        </div>
        <div class="rounded-lg p-4 bg-orange-100 dark:bg-orange-950/30 text-center">
          <div class="text-xl font-bold tabular-nums text-orange-900 dark:text-orange-100">
            {{ fmt(data.commission) }}
          </div>
          <div class="text-xs text-orange-800 dark:text-orange-300 mt-1">{{ $t('owners.statement.commission') }}</div>
        </div>
        <div class="rounded-lg p-4 bg-red-100 dark:bg-red-950/30 text-center">
          <div class="text-xl font-bold tabular-nums text-red-900 dark:text-red-100">
            {{ fmt(data.total_expenses) }}
          </div>
          <div class="text-xs text-red-800 dark:text-red-300 mt-1">{{ $t('owners.statement.expenses') }}</div>
        </div>
        <div
          :class="[
            'rounded-lg p-4 text-center',
            data.net_payout >= 0 ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30',
          ]"
        >
          <div
            :class="[
              'text-xl font-bold tabular-nums',
              data.net_payout >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100',
            ]"
          >
            {{ fmt(data.net_payout) }}
          </div>
          <div
            :class="[
              'text-xs mt-1',
              data.net_payout >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300',
            ]"
          >
            {{ $t('owners.statement.payout') }}
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
        <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          {{ $t('owners.statement.byProperties') }}
        </h3>
        <DataTable :value="data.properties" size="small" data-key="property_name">
          <Column field="property_name" :header="$t('owners.statement.columns.property')" />
          <Column field="revenue" :header="$t('owners.statement.columns.revenue')">
            <template #body="{ data }"><span class="tabular-nums">{{ fmt(data.revenue) }}</span></template>
          </Column>
          <Column field="commission" :header="$t('owners.statement.columns.commission')">
            <template #body="{ data }"><span class="tabular-nums">{{ fmt(data.commission) }}</span></template>
          </Column>
          <Column field="expenses" :header="$t('owners.statement.columns.expenses')">
            <template #body="{ data }"><span class="tabular-nums">{{ fmt(data.expenses) }}</span></template>
          </Column>
          <Column field="payout" :header="$t('owners.statement.columns.payout')">
            <template #body="{ data }"><span class="tabular-nums font-medium">{{ fmt(data.payout) }}</span></template>
          </Column>
        </DataTable>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import { useAuthStore } from '../stores/auth'
import * as ownersApi from '../api/owners'
import { downloadOwnerStatement } from '../api/pdfExport'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const data = ref(null)
const loading = ref(false)
const error = ref(null)
const downloading = ref(false)

async function downloadPdf() {
  downloading.value = true
  try {
    await downloadOwnerStatement(route.params.id)
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
  } finally {
    downloading.value = false
  }
}

const currency = computed(() => authStore.organization?.currency || 'RUB')

function fmt(cents) {
  return formatMoney(cents, currency.value)
}

async function loadStatement() {
  loading.value = true
  error.value = null
  try {
    data.value = await ownersApi.statement(route.params.id)
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    error.value = t('owners.statement.messages.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadStatement())

defineExpose({ data, loading, error, downloading, fmt, loadStatement, downloadPdf })
</script>
