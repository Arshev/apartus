<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-btn variant="text" icon="mdi-arrow-left" :to="'/owners'" />
      <h1 class="text-h4 ml-2">Отчёт собственника</h1>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <template v-if="data">
      <h2 class="text-h5 mb-4">{{ data.owner_name }} ({{ (data.commission_rate / 100).toFixed(1) }}%)</h2>

      <v-row class="mb-4">
        <v-col cols="6" sm="3">
          <v-card color="green" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.total_revenue) }}</div>
              <div class="text-caption">Выручка</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="orange" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.commission) }}</div>
              <div class="text-caption">Комиссия</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card color="red" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.total_expenses) }}</div>
              <div class="text-caption">Расходы</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card :color="data.net_payout >= 0 ? 'green' : 'red'" variant="tonal">
            <v-card-text class="text-center">
              <div class="text-h5">{{ fmt(data.net_payout) }}</div>
              <div class="text-caption">К выплате</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-card>
        <v-card-title>По объектам</v-card-title>
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
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import * as ownersApi from '../api/owners'

const route = useRoute()
const data = ref(null)
const loading = ref(false)
const error = ref(null)

const propHeaders = [
  { title: 'Объект', key: 'property_name' },
  { title: 'Выручка', key: 'revenue' },
  { title: 'Комиссия', key: 'commission' },
  { title: 'Расходы', key: 'expenses' },
  { title: 'К выплате', key: 'payout' },
]

function fmt(cents) { return `${(cents / 100).toFixed(0)} ₽` }

async function loadStatement() {
  loading.value = true
  error.value = null
  try {
    data.value = await ownersApi.statement(route.params.id)
  } catch (e) {
    console.error(e)
    error.value = 'Не удалось загрузить отчёт'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadStatement())

defineExpose({ data, loading, error, fmt, loadStatement, propHeaders })
</script>
