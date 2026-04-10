<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Календарь</h1>
      <v-spacer />
      <v-btn icon="mdi-chevron-left" variant="text" @click="shiftDays(-7)" />
      <v-btn variant="text" @click="goToday">Сегодня</v-btn>
      <v-btn icon="mdi-chevron-right" variant="text" @click="shiftDays(7)" />
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">{{ error }}</v-alert>

    <div v-if="unitRows.length" class="calendar-grid" :style="gridStyle">
      <!-- Header row: unit label + date cells -->
      <div class="calendar-header-cell sticky-col">Юнит</div>
      <div v-for="d in dateRange" :key="d" class="calendar-header-cell text-caption text-center">
        {{ formatDateShort(d) }}
      </div>

      <!-- Unit rows -->
      <template v-for="row in unitRows" :key="row.unit.id">
        <div class="calendar-unit-cell sticky-col text-body-2">
          {{ row.propertyName }} → {{ row.unit.name }}
        </div>
        <div
          v-for="d in dateRange"
          :key="`${row.unit.id}-${d}`"
          class="calendar-day-cell"
          @click="handleCellClick(row.unit.id, d)"
        >
          <div
            v-for="r in getReservationsForCell(row.unit.id, d)"
            :key="r.id"
            class="calendar-bar"
            :class="`bar-${r.status}`"
            :title="`${r.guest_name || 'Блокировка'} (${r.check_in} — ${r.check_out})`"
            @click.stop="$router.push(`/reservations/${r.id}/edit`)"
          >
            <span v-if="d === r.check_in" class="bar-label text-caption">{{ r.guest_name || '🔒' }}</span>
          </div>
        </div>
      </template>
    </div>

    <v-empty-state v-else-if="!loading" icon="mdi-calendar-blank" title="Нет юнитов" text="Добавьте объекты и юниты для отображения календаря." />
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as reservationsApi from '../api/reservations'
import * as propertiesApi from '../api/properties'
import * as unitsApi from '../api/units'

const router = useRouter()

const startDate = ref(todayStr())
const loading = ref(false)
const error = ref(null)
const reservations = ref([])
const unitRows = ref([])

const DAYS = 14

const dateRange = computed(() => {
  const dates = []
  const d = new Date(startDate.value)
  for (let i = 0; i < DAYS; i++) {
    dates.push(toStr(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
})

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `180px repeat(${DAYS}, minmax(60px, 1fr))`,
  gap: '0',
}))

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function toStr(d) {
  return d.toISOString().slice(0, 10)
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftDays(n) {
  const d = new Date(startDate.value)
  d.setDate(d.getDate() + n)
  startDate.value = toStr(d)
}

function goToday() {
  startDate.value = todayStr()
}

function getReservationsForCell(unitId, dateStr) {
  return reservations.value.filter((r) =>
    r.unit_id === unitId &&
    r.check_in <= dateStr &&
    r.check_out > dateStr &&
    r.status !== 'cancelled'
  )
}

function handleCellClick(unitId, dateStr) {
  router.push(`/reservations/new?unit_id=${unitId}&check_in=${dateStr}`)
}

async function loadData() {
  loading.value = true
  try {
    const endDate = dateRange.value[dateRange.value.length - 1]
    const [resList, propsList] = await Promise.all([
      reservationsApi.list({ from: startDate.value, to: endDate }),
      propertiesApi.list(),
    ])
    reservations.value = resList

    const rows = []
    for (const p of propsList) {
      const uList = await unitsApi.list(p.id)
      for (const u of uList) {
        rows.push({ unit: u, propertyName: p.name })
      }
    }
    unitRows.value = rows
  } catch (e) {
    console.error('Calendar loadData failed:', e)
    error.value = 'Не удалось загрузить данные календаря'
  } finally {
    loading.value = false
  }
}

watch(startDate, () => loadData())
onMounted(() => loadData())

defineExpose({ startDate, dateRange, unitRows, reservations, loading, shiftDays, goToday, formatDateShort, getReservationsForCell, handleCellClick })
</script>

<style scoped>
.calendar-grid {
  border: 1px solid #e0e0e0;
  overflow-x: auto;
}
.calendar-header-cell {
  padding: 6px 4px;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  font-weight: 500;
}
.calendar-unit-cell {
  padding: 8px 6px;
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #e0e0e0;
  background: #fafafa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 1;
}
.calendar-day-cell {
  min-height: 36px;
  border-bottom: 1px solid #e0e0e0;
  border-right: 1px solid #f0f0f0;
  cursor: pointer;
  position: relative;
}
.calendar-day-cell:hover {
  background: #e3f2fd;
}
.calendar-bar {
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  margin: 2px 0;
}
.bar-confirmed { background: #42a5f5; }
.bar-checked_in { background: #66bb6a; }
.bar-checked_out { background: #bdbdbd; }
.bar-label {
  color: white;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  line-height: 24px;
}
</style>
