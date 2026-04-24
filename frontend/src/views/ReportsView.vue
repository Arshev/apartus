<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5 font-weight-bold">{{ $t('reports.title') }}</h1>
      <v-spacer />
      <v-select
        v-model="selectedCurrency"
        :label="$t('reports.displayCurrency')"
        :items="currencyOptions"
        item-title="title"
        item-value="value"
        density="compact"
        hide-details
        class="mr-4"
        style="max-width: 240px"
        @update:model-value="loadReport"
      />
      <v-btn variant="outlined" prepend-icon="mdi-file-pdf-box" @click="downloadPdf" :loading="downloading">{{ $t('reports.downloadPdf') }}</v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="data?.currency_fallback_reason === 'rate_not_found'" type="warning" class="mb-4">
      {{ $t('reports.messages.currencyFallbackNotice') }}
    </v-alert>

    <template v-if="data">
      <!-- Finance KPI — full-color like RentProg -->
      <v-row class="mb-6">
        <v-col cols="12" sm="4">
          <v-card color="finance-revenue" variant="flat">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-trending-up</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('reports.kpi.revenue') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ formatPrice(data.total_revenue) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card color="finance-expense" variant="flat">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-trending-down</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('reports.kpi.expenses') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ formatPrice(data.total_expenses) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card :color="data.net_income >= 0 ? 'finance-revenue' : 'finance-expense'" variant="flat">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-cash-multiple</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('reports.kpi.netIncome') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ formatPrice(data.net_income) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Metrics row -->
      <v-row class="mb-6">
        <v-col cols="6" sm="3">
          <v-card variant="outlined">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ (data.occupancy_rate * 100).toFixed(1) }}%</div>
              <div class="text-caption text-medium-emphasis">{{ $t('reports.metrics.occupancy') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="outlined">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ formatPrice(data.adr) }}</div>
              <div class="text-caption text-medium-emphasis">{{ $t('reports.metrics.adr') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="outlined">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ formatPrice(data.revpar) }}</div>
              <div class="text-caption text-medium-emphasis">{{ $t('reports.metrics.revpar') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card variant="outlined">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ data.occupied_nights }} / {{ data.total_room_nights }}</div>
              <div class="text-caption text-medium-emphasis">{{ $t('reports.metrics.nights') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>{{ $t('reports.revenueByProperty') }}</v-card-title>
            <v-list density="compact">
              <v-list-item v-for="r in data.revenue_by_property" :key="r.property_name"
                :title="r.property_name" :subtitle="formatPrice(r.revenue)" />
            </v-list>
            <v-card-text v-if="!data.revenue_by_property.length" class="text-medium-emphasis">{{ $t('common.noData') }}</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>{{ $t('reports.expensesByCategory') }}</v-card-title>
            <v-list density="compact">
              <v-list-item v-for="e in data.expenses_by_category" :key="e.category"
                :title="expenseCategoryLabel(e.category)" :subtitle="formatPrice(e.total)" />
            </v-list>
            <v-card-text v-if="!data.expenses_by_category.length" class="text-medium-emphasis">{{ $t('common.noData') }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import * as reportsApi from '../api/reports'
import { downloadFinancialReport } from '../api/pdfExport'
import { useAuthStore } from '../stores/auth'
import { formatMoney, CURRENCY_LIST } from '../utils/currency'

const { t } = useI18n()
const data = ref(null)
const loading = ref(false)
const error = ref(null)
const downloading = ref(false)
const selectedCurrency = ref(null)
const authStore = useAuthStore()

const currencyOptions = computed(() => [
  { title: t('reports.displayCurrencyAuto'), value: null },
  ...CURRENCY_LIST.map((c) => ({ title: c.label, value: c.code })),
])

async function downloadPdf() {
  downloading.value = true
  try {
    await downloadFinancialReport(selectedCurrency.value ? { currency: selectedCurrency.value } : {})
  } catch (e) { console.error(e) }
  finally { downloading.value = false }
}

const categoryKeys = ['maintenance', 'utilities', 'cleaning', 'supplies', 'other']
function expenseCategoryLabel(cat) {
  if (categoryKeys.includes(cat)) return t(`expenses.categories.${cat}`)
  return cat
}

const displayCurrency = computed(() => data.value?.currency || authStore.organization?.currency || 'RUB')
function formatPrice(cents) {
  return formatMoney(cents, displayCurrency.value)
}

async function loadReport() {
  loading.value = true
  error.value = null
  try {
    const params = selectedCurrency.value ? { currency: selectedCurrency.value } : {}
    data.value = await reportsApi.financial(params)
  } catch (e) { console.error(e);
    error.value = t('reports.messages.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadReport())

defineExpose({ data, loading, error, formatPrice, loadReport, expenseCategoryLabel, selectedCurrency })
</script>
