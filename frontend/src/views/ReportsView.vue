<template>
  <div class="max-w-6xl mx-auto px-6 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('reports.title') }}
      </h1>
      <div class="flex-1" />
      <Button
        :label="$t('reports.downloadPdf')"
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
      <!-- Finance KPI — keeps tonal treatment (not editorial-hero; functional) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="rounded-lg p-4 bg-green-100 dark:bg-green-950/30">
          <div class="flex items-center gap-2 mb-2 text-green-800 dark:text-green-300">
            <i class="pi pi-arrow-up-right" aria-hidden="true" />
            <span class="text-xs font-medium uppercase tracking-wide">{{ $t('reports.kpi.revenue') }}</span>
          </div>
          <div class="text-2xl font-bold tabular-nums text-green-900 dark:text-green-100">
            {{ formatPrice(data.total_revenue) }}
          </div>
        </div>
        <div class="rounded-lg p-4 bg-red-100 dark:bg-red-950/30">
          <div class="flex items-center gap-2 mb-2 text-red-800 dark:text-red-300">
            <i class="pi pi-arrow-down-right" aria-hidden="true" />
            <span class="text-xs font-medium uppercase tracking-wide">{{ $t('reports.kpi.expenses') }}</span>
          </div>
          <div class="text-2xl font-bold tabular-nums text-red-900 dark:text-red-100">
            {{ formatPrice(data.total_expenses) }}
          </div>
        </div>
        <div
          :class="[
            'rounded-lg p-4',
            data.net_income >= 0 ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30',
          ]"
        >
          <div
            :class="[
              'flex items-center gap-2 mb-2',
              data.net_income >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300',
            ]"
          >
            <i class="pi pi-wallet" aria-hidden="true" />
            <span class="text-xs font-medium uppercase tracking-wide">{{ $t('reports.kpi.netIncome') }}</span>
          </div>
          <div
            :class="[
              'text-2xl font-bold tabular-nums',
              data.net_income >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100',
            ]"
          >
            {{ formatPrice(data.net_income) }}
          </div>
        </div>
      </div>

      <!-- Metrics row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-center">
          <div class="text-xl font-bold tabular-nums text-surface-900 dark:text-surface-100">
            {{ (data.occupancy_rate * 100).toFixed(1) }}%
          </div>
          <div class="text-xs text-surface-600 dark:text-surface-400 mt-1">{{ $t('reports.metrics.occupancy') }}</div>
        </div>
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-center">
          <div class="text-xl font-bold tabular-nums text-surface-900 dark:text-surface-100">
            {{ formatPrice(data.adr) }}
          </div>
          <div class="text-xs text-surface-600 dark:text-surface-400 mt-1">{{ $t('reports.metrics.adr') }}</div>
        </div>
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-center">
          <div class="text-xl font-bold tabular-nums text-surface-900 dark:text-surface-100">
            {{ formatPrice(data.revpar) }}
          </div>
          <div class="text-xs text-surface-600 dark:text-surface-400 mt-1">{{ $t('reports.metrics.revpar') }}</div>
        </div>
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-3 text-center">
          <div class="text-xl font-bold tabular-nums text-surface-900 dark:text-surface-100">
            {{ data.occupied_nights }} / {{ data.total_room_nights }}
          </div>
          <div class="text-xs text-surface-600 dark:text-surface-400 mt-1">{{ $t('reports.metrics.nights') }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
          <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            {{ $t('reports.revenueByProperty') }}
          </h3>
          <ul v-if="data.revenue_by_property.length" class="divide-y divide-surface-200 dark:divide-surface-700">
            <li v-for="r in data.revenue_by_property" :key="r.property_name" class="px-4 py-2 flex justify-between">
              <span class="text-sm text-surface-800 dark:text-surface-200">{{ r.property_name }}</span>
              <span class="text-sm tabular-nums text-surface-600 dark:text-surface-400">{{ formatPrice(r.revenue) }}</span>
            </li>
          </ul>
          <div v-else class="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{{ $t('common.noData') }}</div>
        </div>
        <div class="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
          <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            {{ $t('reports.expensesByCategory') }}
          </h3>
          <ul v-if="data.expenses_by_category.length" class="divide-y divide-surface-200 dark:divide-surface-700">
            <li v-for="e in data.expenses_by_category" :key="e.category" class="px-4 py-2 flex justify-between">
              <span class="text-sm text-surface-800 dark:text-surface-200">{{ expenseCategoryLabel(e.category) }}</span>
              <span class="text-sm tabular-nums text-surface-600 dark:text-surface-400">{{ formatPrice(e.total) }}</span>
            </li>
          </ul>
          <div v-else class="px-4 py-3 text-sm text-surface-600 dark:text-surface-400">{{ $t('common.noData') }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import Button from 'primevue/button'
import * as reportsApi from '../api/reports'
import { downloadFinancialReport } from '../api/pdfExport'
import { useAuthStore } from '../stores/auth'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()
const data = ref(null)
const loading = ref(false)
const error = ref(null)
const downloading = ref(false)

async function downloadPdf() {
  downloading.value = true
  try {
    await downloadFinancialReport()
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
  } finally {
    downloading.value = false
  }
}

const authStore = useAuthStore()

const categoryKeys = ['maintenance', 'utilities', 'cleaning', 'supplies', 'other']
function expenseCategoryLabel(cat) {
  if (categoryKeys.includes(cat)) return t(`expenses.categories.${cat}`)
  return cat
}

const currency = computed(() => authStore.organization?.currency || 'RUB')
function formatPrice(cents) {
  return formatMoney(cents, currency.value)
}

async function loadReport() {
  loading.value = true
  error.value = null
  try {
    data.value = await reportsApi.financial()
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    error.value = t('reports.messages.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadReport())

defineExpose({ data, loading, error, downloading, formatPrice, loadReport, expenseCategoryLabel, downloadPdf })
</script>
