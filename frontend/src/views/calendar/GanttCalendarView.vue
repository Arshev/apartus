<template>
  <v-container fluid class="pa-4">
    <div class="d-flex align-center mb-4 ga-2 flex-wrap">
      <h1 class="text-h5">{{ $t('calendar.title') }}</h1>
      <v-spacer />

      <v-btn-toggle v-model="rangeDays" mandatory density="comfortable" variant="outlined" color="primary">
        <v-btn :value="7">{{ $t('calendar.gantt.toolbar.range7') }}</v-btn>
        <v-btn :value="14">{{ $t('calendar.gantt.toolbar.range14') }}</v-btn>
        <v-btn :value="30">{{ $t('calendar.gantt.toolbar.range30') }}</v-btn>
      </v-btn-toggle>

      <v-btn
        prepend-icon="mdi-swap-horizontal"
        :color="specialMode === 'handover' ? 'primary' : undefined"
        :variant="specialMode === 'handover' ? 'elevated' : 'text'"
        @click="toggleHandover"
        data-testid="handover-btn"
      >
        {{ $t('calendar.gantt.modes.handover') }}
      </v-btn>

      <v-btn
        prepend-icon="mdi-alert-circle-outline"
        :color="specialMode === 'overdue' ? 'primary' : undefined"
        :variant="specialMode === 'overdue' ? 'elevated' : 'text'"
        @click="toggleOverdue"
        data-testid="overdue-btn"
      >
        {{ $t('calendar.gantt.modes.overdue') }}
      </v-btn>

      <v-btn variant="text" prepend-icon="mdi-calendar-today" @click="goToday" data-testid="today-btn">
        {{ $t('calendar.gantt.toolbar.today') }}
      </v-btn>

      <v-menu v-model="datePickerOpen" :close-on-content-click="false" location="bottom end">
        <template v-slot:activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-calendar-arrow-right" variant="text" :title="$t('calendar.gantt.toolbar.jumpToDate')" data-testid="jump-btn" />
        </template>
        <v-date-picker v-model="jumpDate" hide-header @update:model-value="onJumpDate" />
      </v-menu>

      <v-btn icon="mdi-refresh" variant="text" :loading="loading" @click="loadData" :title="$t('calendar.gantt.toolbar.refresh')" data-testid="refresh-btn" />
    </div>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />
    <v-alert v-if="error" type="error" closable class="mb-2" @click:close="error = null">{{ error }}</v-alert>

    <GanttTimeline
      v-if="units.length"
      ref="timelineEl"
      :units="units"
      :reservations="reservations"
      :view-start="viewStart"
      :view-end="viewEnd"
      :special-mode="specialMode"
      @show-booking="onShowBooking"
      @show-tooltip="onShowTooltip"
      @hide-tooltip="onHideTooltip"
      @context-menu="onContextMenu"
    />

    <v-empty-state v-else-if="!loading" icon="mdi-calendar-blank"
      :title="$t('calendar.emptyState.title')"
      :text="$t('calendar.emptyState.text')"
    />

    <GanttTooltip :booking="tooltip.booking" :visible="tooltip.visible" :x="tooltip.x" :y="tooltip.y" />

    <!-- Context menu -->
    <v-menu v-model="contextMenu.open" :target="[contextMenu.x, contextMenu.y]" location="bottom start">
      <v-list density="compact">
        <v-list-item @click="contextEdit" prepend-icon="mdi-pencil" :title="$t('calendar.gantt.contextMenu.edit')" />
        <v-list-item v-if="contextMenu.booking?.status === 'confirmed'" @click="contextCheckIn" prepend-icon="mdi-login" :title="$t('calendar.gantt.contextMenu.checkIn')" />
        <v-list-item v-if="contextMenu.booking?.status === 'checked_in'" @click="contextCheckOut" prepend-icon="mdi-logout" :title="$t('calendar.gantt.contextMenu.checkOut')" />
        <v-list-item v-if="contextMenu.booking && contextMenu.booking.status !== 'cancelled' && contextMenu.booking.status !== 'checked_out'" @click="contextCancel" prepend-icon="mdi-cancel" :title="$t('calendar.gantt.contextMenu.cancel')" />
      </v-list>
    </v-menu>

    <v-snackbar v-model="snackbar.open" :color="snackbar.color" :timeout="3000">{{ snackbar.text }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import GanttTimeline from './GanttTimeline.vue'
import GanttTooltip from './GanttTooltip.vue'
import * as reservationsApi from '../../api/reservations'
import * as allUnitsApi from '../../api/allUnits'
import { addDays, startOfDay, formatIsoDate, parseIsoDate } from '../../utils/date'

const STORAGE_KEY = 'apartus-calendar-view'
const DEFAULT_RANGE_DAYS = 14
const SUPPORTED_RANGES = [7, 14, 30]
const SUPPORTED_SPECIAL_MODES = ['', 'handover', 'overdue']

const { t } = useI18n()
const router = useRouter()

const rangeDays = ref(DEFAULT_RANGE_DAYS)
const anchorDate = ref(startOfDay(new Date()))
const specialMode = ref('')
const reservations = ref([])
const units = ref([])
const loading = ref(false)
const error = ref(null)
const timelineEl = ref(null)

// FT-022: единый helper — mutual exclusion гарантируется одним местом.
// FT-021 toggleHandover остаётся экспортированным shim'ом для обратной
// совместимости (ER-01 регрессия тестов).
function setSpecialMode(mode) {
  specialMode.value = specialMode.value === mode ? '' : mode
}

function toggleHandover() { setSpecialMode('handover') }
function toggleOverdue() { setSpecialMode('overdue') }

const viewStart = computed(() => anchorDate.value)
const viewEnd = computed(() => addDays(anchorDate.value, rangeDays.value - 1))

// Tooltip state
const tooltip = ref({ booking: null, visible: false, x: 0, y: 0 })
function onShowTooltip(payload) { tooltip.value = { booking: payload.booking, visible: true, x: payload.x, y: payload.y } }
function onHideTooltip() { tooltip.value = { ...tooltip.value, visible: false } }

// Context menu state
const contextMenu = ref({ open: false, booking: null, x: 0, y: 0 })
function onContextMenu(payload) {
  onHideTooltip()
  contextMenu.value = { open: true, booking: payload.booking, x: payload.x, y: payload.y }
}

// Snackbar state
const snackbar = ref({ open: false, text: '', color: 'success' })
function showSnackbar(text, color = 'success') { snackbar.value = { open: true, text, color } }

function onShowBooking(id) {
  router.push(`/reservations/${id}/edit`)
}

function contextEdit() {
  if (!contextMenu.value.booking) return
  router.push(`/reservations/${contextMenu.value.booking.id}/edit`)
  contextMenu.value.open = false
}

async function contextCheckIn() {
  if (!contextMenu.value.booking) return
  try {
    await reservationsApi.checkIn(contextMenu.value.booking.id)
    await loadData()
  } catch (e) {
    console.error(e)
    showSnackbar(t('calendar.gantt.errors.checkInFailed'), 'error')
  } finally {
    contextMenu.value.open = false
  }
}

async function contextCheckOut() {
  if (!contextMenu.value.booking) return
  try {
    await reservationsApi.checkOut(contextMenu.value.booking.id)
    await loadData()
  } catch (e) {
    console.error(e)
    showSnackbar(t('calendar.gantt.errors.checkOutFailed'), 'error')
  } finally {
    contextMenu.value.open = false
  }
}

async function contextCancel() {
  if (!contextMenu.value.booking) return
  try {
    await reservationsApi.cancel(contextMenu.value.booking.id)
    await loadData()
  } catch (e) {
    console.error(e)
    showSnackbar(t('calendar.gantt.errors.cancelFailed'), 'error')
  } finally {
    contextMenu.value.open = false
  }
}

// Toolbar handlers
function goToday() {
  anchorDate.value = startOfDay(new Date())
  if (timelineEl.value) timelineEl.value.scrollToToday()
}

const datePickerOpen = ref(false)
const jumpDate = ref(null)
function onJumpDate(picked) {
  if (!picked) return
  const d = picked instanceof Date ? picked : parseIsoDate(picked)
  anchorDate.value = startOfDay(d)
  datePickerOpen.value = false
  if (timelineEl.value) timelineEl.value.scrollToDate(d)
}

// Data fetching
async function loadData() {
  loading.value = true
  error.value = null
  try {
    const [resList, unitsList] = await Promise.all([
      reservationsApi.list({ from: formatIsoDate(viewStart.value), to: formatIsoDate(viewEnd.value) }),
      allUnitsApi.list(),
    ])
    reservations.value = resList
    units.value = unitsList
  } catch (e) {
    console.error('[gantt] loadData failed:', e)
    error.value = t('calendar.gantt.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

// localStorage round-trip
function loadStoredView() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (SUPPORTED_RANGES.includes(parsed.rangeDays)) rangeDays.value = parsed.rangeDays
    // Backwards-compat: legacy payloads without `specialMode` resolve to ''.
    if (typeof parsed.specialMode === 'string' && SUPPORTED_SPECIAL_MODES.includes(parsed.specialMode)) {
      specialMode.value = parsed.specialMode
    }
  } catch {
    // Persistence is best-effort; corrupt JSON or unavailable storage falls back to defaults.
  }
}

function persistView() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ rangeDays: rangeDays.value, specialMode: specialMode.value }))
  } catch {
    // Ignore — best-effort.
  }
}

watch(rangeDays, () => {
  persistView()
  loadData()
})
watch(specialMode, () => persistView())
watch(anchorDate, () => loadData())

// Refetch on tab focus (visibilitychange).
function onVisibilityChange() {
  if (!document.hidden) loadData()
}

onMounted(() => {
  loadStoredView()
  loadData()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

defineExpose({
  rangeDays, anchorDate, specialMode, viewStart, viewEnd, reservations, units, loading, error,
  tooltip, contextMenu, snackbar, jumpDate, datePickerOpen, timelineEl,
  loadData, goToday, onJumpDate, onShowBooking, onShowTooltip, onHideTooltip, onContextMenu,
  contextEdit, contextCheckIn, contextCheckOut, contextCancel, toggleHandover, toggleOverdue, setSpecialMode,
})
</script>
