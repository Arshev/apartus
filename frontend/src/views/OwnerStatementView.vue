<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-btn variant="text" icon="mdi-arrow-left" :to="'/owners'" />
      <h1 class="text-h4 ml-2">{{ $t('owners.statement.title') }}</h1>
      <v-spacer />
      <v-btn variant="outlined" prepend-icon="mdi-file-pdf-box" @click="downloadPdf" :loading="downloading">{{ $t('owners.statement.downloadPdf') }}</v-btn>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="data?.currency_fallback_reason === 'rate_not_found'" type="warning" class="mb-4">
      {{ $t('owners.statement.messages.currencyFallbackNotice') }}
    </v-alert>

    <template v-if="data">
      <h2 class="text-h5 mb-4">{{ data.owner_name }} ({{ (data.commission_rate / 100).toFixed(1) }}%)</h2>

      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card color="green" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.total_revenue) }}</div>
              <div class="text-caption">{{ $t('owners.statement.revenue') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="orange" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.commission) }}</div>
              <div class="text-caption">{{ $t('owners.statement.commission') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="red" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.total_expenses) }}</div>
              <div class="text-caption">{{ $t('owners.statement.expenses') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card :color="data.net_payout >= 0 ? 'green' : 'red'" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.net_payout) }}</div>
              <div class="text-caption">{{ $t('owners.statement.payout') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card>
        <v-card-title>{{ $t('owners.statement.byProperties') }}</v-card-title>
        <v-data-table :headers="propHeaders" :items="data.properties" density="compact">
          <template v-slot:item.revenue="{ item }">{{ fmt(item.revenue) }}</template>
          <template v-slot:item.commission="{ item }">{{ fmt(item.commission) }}</template>
          <template v-slot:item.expenses="{ item }">{{ fmt(item.expenses) }}</template>
          <template v-slot:item.payout="{ item }">{{ fmt(item.payout) }}</template>
        </v-data-table>
      </v-card>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
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
  try { await downloadOwnerStatement(route.params.id) }
  catch (e) { console.error(e) }
  finally { downloading.value = false }
}

const propHeaders = computed(() => [
  { title: t('owners.statement.columns.property'), key: 'property_name' },
  { title: t('owners.statement.columns.revenue'), key: 'revenue' },
  { title: t('owners.statement.columns.commission'), key: 'commission' },
  { title: t('owners.statement.columns.expenses'), key: 'expenses' },
  { title: t('owners.statement.columns.payout'), key: 'payout' },
])

function fmt(cents) {
  const code = data.value?.currency || authStore.organization?.currency || 'RUB'
  return formatMoney(cents, code)
}

async function loadStatement() {
  loading.value = true
  error.value = null
  try {
    data.value = await ownersApi.statement(route.params.id)
  } catch (e) {
    console.error(e)
    error.value = t('owners.statement.messages.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadStatement())

defineExpose({ data, loading, error, fmt, loadStatement, propHeaders })
</script>
