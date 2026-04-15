<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 font-weight-bold mb-1">{{ $t('dashboard.greeting', { name: authStore.user?.full_name }) }}</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">{{ authStore.organization?.name }}</p>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <template v-if="data">
      <!-- KPI Row — full-color cards like RentProg report header -->
      <v-row class="mb-6">
        <v-col cols="6" md="3">
          <v-card color="primary" class="kpi-card">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-door-open</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('dashboard.kpi.units') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ data.total_units }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card color="info" class="kpi-card">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-chart-arc</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('dashboard.kpi.occupancy') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ (data.occupancy_rate * 100).toFixed(0) }}%</div>
              <v-progress-linear
                :model-value="data.occupancy_rate * 100"
                bg-color="rgba(255,255,255,0.3)"
                color="white"
                class="mt-2"
                rounded
              />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card color="finance-revenue" class="kpi-card">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-cash-plus</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('dashboard.kpi.revenue') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ formatPrice(data.revenue_this_month) }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" md="3">
          <v-card color="secondary" class="kpi-card">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-2">
                <v-icon size="20" class="mr-2">mdi-calendar-check</v-icon>
                <span class="text-caption font-weight-medium text-uppercase">{{ $t('dashboard.kpi.reservations') }}</span>
              </div>
              <div class="text-h4 font-weight-bold">{{ totalReservations }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Status summary — saturated colored cards -->
      <v-row class="mb-6">
        <v-col cols="6" sm="3">
          <v-card color="status-confirmed" variant="flat">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ data.reservations_by_status.confirmed }}</div>
              <div class="text-caption">{{ $t('dashboard.statuses.confirmed') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="status-checked-in" variant="flat">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ data.reservations_by_status.checked_in }}</div>
              <div class="text-caption">{{ $t('dashboard.statuses.checkedIn') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="status-checked-out" variant="flat">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ data.reservations_by_status.checked_out }}</div>
              <div class="text-caption">{{ $t('dashboard.statuses.checkedOut') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="status-cancelled" variant="flat">
            <v-card-text class="text-center pa-3">
              <div class="text-h5 font-weight-bold">{{ data.reservations_by_status.cancelled }}</div>
              <div class="text-caption">{{ $t('dashboard.statuses.cancelled') }}</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Upcoming check-ins/outs -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="d-flex align-center text-body-1 font-weight-bold pa-4 pb-2">
              <v-icon color="primary" size="20" class="mr-2">mdi-login</v-icon>
              {{ $t('dashboard.checkIns') }}
            </v-card-title>
            <v-divider />
            <v-list v-if="data.upcoming_check_ins.length" density="compact" class="pa-0">
              <v-list-item
                v-for="(r, i) in data.upcoming_check_ins"
                :key="r.id"
                :class="{ 'border-b': i < data.upcoming_check_ins.length - 1 }"
              >
                <template v-slot:prepend>
                  <v-icon color="status-confirmed" size="18">mdi-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ r.guest_name || $t('common.blocking') }} — {{ r.unit_name }}</v-list-item-title>
                <template v-slot:append>
                  <span class="text-caption text-medium-emphasis">{{ r.check_in }}</span>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-medium-emphasis text-center">{{ $t('dashboard.noCheckIns') }}</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="d-flex align-center text-body-1 font-weight-bold pa-4 pb-2">
              <v-icon color="secondary" size="20" class="mr-2">mdi-logout</v-icon>
              {{ $t('dashboard.checkOuts') }}
            </v-card-title>
            <v-divider />
            <v-list v-if="data.upcoming_check_outs.length" density="compact" class="pa-0">
              <v-list-item
                v-for="(r, i) in data.upcoming_check_outs"
                :key="r.id"
                :class="{ 'border-b': i < data.upcoming_check_outs.length - 1 }"
              >
                <template v-slot:prepend>
                  <v-icon color="status-checked-out" size="18">mdi-circle</v-icon>
                </template>
                <v-list-item-title class="text-body-2">{{ r.guest_name || $t('common.blocking') }} — {{ r.unit_name }}</v-list-item-title>
                <template v-slot:append>
                  <span class="text-caption text-medium-emphasis">{{ r.check_out }}</span>
                </template>
              </v-list-item>
            </v-list>
            <v-card-text v-else class="text-medium-emphasis text-center">{{ $t('dashboard.noCheckOuts') }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import * as dashboardApi from '../api/dashboard'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()

const authStore = useAuthStore()
const data = ref(null)
const loading = ref(false)
const error = ref(null)

const currency = computed(() => authStore.organization?.currency || 'RUB')
function formatPrice(cents) {
  return formatMoney(cents, currency.value)
}

const totalReservations = computed(() => {
  if (!data.value) return 0
  const s = data.value.reservations_by_status
  return (s.confirmed || 0) + (s.checked_in || 0) + (s.checked_out || 0) + (s.cancelled || 0)
})

async function loadDashboard() {
  loading.value = true
  error.value = null
  try {
    data.value = await dashboardApi.get()
  } catch (e) { console.error(e);
    error.value = t('dashboard.messages.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadDashboard())

defineExpose({ data, loading, error, formatPrice, loadDashboard, totalReservations })
</script>

<style scoped>
.kpi-card {
  transition: transform 0.15s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
}
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
