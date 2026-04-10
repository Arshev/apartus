<template>
  <v-container>
    <h1 class="text-h4 mb-4">Финансовый отчёт</h1>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <template v-if="data">
      <v-row class="mb-4">
        <v-col cols="12" sm="4">
          <v-card color="green" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ formatPrice(data.total_revenue) }}</div>
              <div class="text-subtitle-1">Выручка</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card color="red" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ formatPrice(data.total_expenses) }}</div>
              <div class="text-subtitle-1">Расходы</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" sm="4">
          <v-card :color="data.net_income >= 0 ? 'green' : 'red'" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h4">{{ formatPrice(data.net_income) }}</div>
              <div class="text-subtitle-1">Чистый доход</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h5">{{ (data.occupancy_rate * 100).toFixed(1) }}%</div>
              <div class="text-caption">Загрузка</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h5">{{ formatPrice(data.adr) }}</div>
              <div class="text-caption">ADR</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h5">{{ formatPrice(data.revpar) }}</div>
              <div class="text-caption">RevPAR</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card>
            <v-card-text class="text-center">
              <div class="text-h5">{{ data.occupied_nights }} / {{ data.total_room_nights }}</div>
              <div class="text-caption">Ночей</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Выручка по объектам</v-card-title>
            <v-list density="compact">
              <v-list-item v-for="r in data.revenue_by_property" :key="r.property_name"
                :title="r.property_name" :subtitle="formatPrice(r.revenue)" />
            </v-list>
            <v-card-text v-if="!data.revenue_by_property.length" class="text-medium-emphasis">Нет данных</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>Расходы по категориям</v-card-title>
            <v-list density="compact">
              <v-list-item v-for="e in data.expenses_by_category" :key="e.category"
                :title="categoryLabels[e.category] || e.category" :subtitle="formatPrice(e.total)" />
            </v-list>
            <v-card-text v-if="!data.expenses_by_category.length" class="text-medium-emphasis">Нет данных</v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import * as reportsApi from '../api/reports'

const data = ref(null)
const loading = ref(false)
const error = ref(null)

const categoryLabels = { maintenance: 'Обслуживание', utilities: 'Коммунальные', cleaning: 'Уборка', supplies: 'Расходники', other: 'Прочее' }

function formatPrice(cents) {
  return `${(cents / 100).toFixed(0)} ₽`
}

async function loadReport() {
  loading.value = true
  error.value = null
  try {
    data.value = await reportsApi.financial()
  } catch {
    error.value = 'Не удалось загрузить отчёт'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadReport())

defineExpose({ data, loading, error, formatPrice, loadReport, categoryLabels })
</script>
