<template>
  <v-container>
    <h1 class="text-h4 mb-2">Здравствуйте, {{ authStore.user?.full_name }}</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">{{ authStore.organization?.name }}</p>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <template v-if="data">
      <!-- KPI Cards -->
      <v-row class="mb-4">
        <v-col cols="12" sm="4">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3">{{ data.total_units }}</div>
              <div class="text-subtitle-1 text-medium-emphasis">Юнитов</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3">{{ (data.occupancy_rate * 100).toFixed(0) }}%</div>
              <div class="text-subtitle-1 text-medium-emphasis">Загрузка сегодня</div>
              <v-progress-linear :model-value="data.occupancy_rate * 100" color="primary" class="mt-2" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h3">{{ formatPrice(data.revenue_this_month) }}</div>
              <div class="text-subtitle-1 text-medium-emphasis">Выручка за месяц</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Status summary -->
      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card color="blue" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ data.reservations_by_status.confirmed }}</div>
              <div class="text-caption">Подтверждено</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="green" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ data.reservations_by_status.checked_in }}</div>
              <div class="text-caption">Заселено</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="grey" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ data.reservations_by_status.checked_out }}</div>
              <div class="text-caption">Выселено</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="red" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ data.reservations_by_status.cancelled }}</div>
              <div class="text-caption">Отменено</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Upcoming check-ins -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Заезды (7 дней)</v-card-title>
            <v-list v-if="data.upcoming_check_ins.length" density="compact">
              <v-list-item
                v-for="r in data.upcoming_check_ins"
                :key="r.id"
                :title="`${r.guest_name || 'Блокировка'} — ${r.unit_name}`"
                :subtitle="r.check_in"
                prepend-icon="mdi-login"
              />
            </v-list>
            <v-card-text v-else class="text-medium-emphasis">Нет предстоящих заездов</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Выезды (7 дней)</v-card-title>
            <v-list v-if="data.upcoming_check_outs.length" density="compact">
              <v-list-item
                v-for="r in data.upcoming_check_outs"
                :key="r.id"
                :title="`${r.guest_name || 'Блокировка'} — ${r.unit_name}`"
                :subtitle="r.check_out"
                prepend-icon="mdi-logout"
              />
            </v-list>
            <v-card-text v-else class="text-medium-emphasis">Нет предстоящих выездов</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import * as dashboardApi from '../api/dashboard'

const authStore = useAuthStore()
const data = ref(null)
const loading = ref(false)
const error = ref(null)

function formatPrice(cents) {
  return cents > 0 ? `${(cents / 100).toFixed(0)} ₽` : '0 ₽'
}

async function loadDashboard() {
  loading.value = true
  error.value = null
  try {
    data.value = await dashboardApi.get()
  } catch {
    error.value = 'Не удалось загрузить данные'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadDashboard())

defineExpose({ data, loading, error, formatPrice, loadDashboard })
</script>
