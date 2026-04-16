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

      <v-btn
        prepend-icon="mdi-clock-alert-outline"
        :color="specialMode === 'idle' ? 'primary' : undefined"
        :variant="specialMode === 'idle' ? 'elevated' : 'text'"
        @click="toggleIdle"
        data-testid="idle-btn"
      >
        {{ $t('calendar.gantt.modes.idle') }}
      </v-btn>

      <v-btn
        prepend-icon="mdi-grid"
        :color="specialMode === 'heatmap' ? 'primary' : undefined"
        :variant="specialMode === 'heatmap' ? 'elevated' : 'text'"
        @click="toggleHeatmap"
        data-testid="heatmap-btn"
      >
        {{ $t('calendar.gantt.modes.heatmap') }}
      </v-btn>

      <!-- FT-025: collapsible search. Icon-only when closed and empty;
           expands to input on click. Stays expanded while query is non-empty
           (visual indicator of active filter). Escape clears + collapses. -->
      <template v-if="searchOpen">
        <v-text-field
          ref="searchInputEl"
          v-model="searchQuery"
          :placeholder="$t('calendar.gantt.search.placeholder')"
          density="compact"
          hide-details
          clearable
          autofocus
          :maxlength="100"
          prepend-inner-icon="mdi-magnify"
          style="max-width: 240px"
          data-testid="search-input"
          @keydown.esc="onSearchEscape"
        />
      </template>
      <v-btn
        v-else
        ref="searchBtnEl"
        icon="mdi-magnify"
        variant="text"
        :title="$t('calendar.gantt.search.open')"
        :aria-label="$t('calendar.gantt.search.open')"
        data-testid="search-btn"
        @click="onOpenSearch"
      />

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
      v-if="filteredUnits.length"
      ref="timelineEl"
      :units="filteredUnits"
      :reservations="filteredReservations"
      :view-start="viewStart"
      :view-end="viewEnd"
      :special-mode="specialMode"
      @show-booking="onShowBooking"
      @show-tooltip="onShowTooltip"
      @hide-tooltip="onHideTooltip"
      @context-menu="onContextMenu"
    />

    <!-- FT-025: empty state for search (query non-empty but no matches).
         Separate from no-data state to keep the distinct UX: here the user
         has data but their filter doesn't hit anything. -->
    <v-empty-state
      v-else-if="!loading && debouncedQuery && units.length"
      icon="mdi-magnify-close"
      :title="$t('calendar.gantt.search.empty', { query: debouncedQuery })"
      data-testid="search-empty-state"
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
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import GanttTimeline from './GanttTimeline.vue'
import GanttTooltip from './GanttTooltip.vue'
import * as reservationsApi from '../../api/reservations'
import * as allUnitsApi from '../../api/allUnits'
import { addDays, startOfDay, formatIsoDate, parseIsoDate } from '../../utils/date'
import { debounce } from '../../utils/debounce'
import { filterUnitsAndReservations } from '../../utils/search'

const SEARCH_DEBOUNCE_MS = 200

const STORAGE_KEY = 'apartus-calendar-view'
const DEFAULT_RANGE_DAYS = 14
const SUPPORTED_RANGES = [7, 14, 30]
const SUPPORTED_SPECIAL_MODES = ['', 'handover', 'overdue', 'idle', 'heatmap']

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

// FT-025: search state.
// searchQuery — raw v-model for the text field (updates on every keystroke).
// debouncedQuery — the value actually applied to filtering (200ms trailing-edge).
// searchOpen — controls collapsed-icon vs expanded-input toolbar UI.
const searchQuery = ref('')
const debouncedQuery = ref('')
const searchOpen = ref(false)
const searchInputEl = ref(null)
const searchBtnEl = ref(null)

// FT-022: единый helper — mutual exclusion гарантируется одним местом.
// FT-021 toggleHandover остаётся экспортированным shim'ом для обратной
// совместимости (ER-01 регрессия тестов).
function setSpecialMode(mode) {
  specialMode.value = specialMode.value === mode ? '' : mode
}

function toggleHandover() { setSpecialMode('handover') }
function toggleOverdue() { setSpecialMode('overdue') }
function toggleIdle() { setSpecialMode('idle') }
function toggleHeatmap() { setSpecialMode('heatmap') }

const viewStart = computed(() => anchorDate.value)
const viewEnd = computed(() => addDays(anchorDate.value, rangeDays.value - 1))

// FT-025: apply search filter BEFORE passing to <GanttTimeline>. Special modes
// then operate on the filtered subset (REQ-07 stacks with modes).
const filtered = computed(() =>
  filterUnitsAndReservations(units.value, reservations.value, debouncedQuery.value),
)
const filteredUnits = computed(() => filtered.value.units)
const filteredReservations = computed(() => filtered.value.reservations)

// Debounced setter: on every keystroke update debouncedQuery after 200ms idle.
const debouncedSetQuery = debounce((q) => {
  debouncedQuery.value = q
}, SEARCH_DEBOUNCE_MS)

watch(searchQuery, (q) => debouncedSetQuery(q))

function onOpenSearch() {
  searchOpen.value = true
  // Autofocus на v-text-field открывает input focused. Collapse происходит
  // только по Escape (явное действие) — случайный blur (например клик по
  // бару календаря) не закрывает поиск, иначе activity-фильтр терялся бы
  // при первом же взаимодействии с календарём.
}

async function onSearchEscape() {
  // Atomic: clear + flush debounce + collapse + refocus icon button.
  searchQuery.value = ''
  debouncedSetQuery.cancel()
  debouncedQuery.value = ''
  searchOpen.value = false
  await nextTick()
  if (searchBtnEl.value?.$el?.focus) searchBtnEl.value.$el.focus()
}

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
    // FT-025: restore search. Set BOTH searchQuery and debouncedQuery sync —
    // bypassing the debounce wrapper — so the first render already shows the
    // filtered DOM (no flicker). Auto-expand bar when there's a stored query.
    if (typeof parsed.searchQuery === 'string' && parsed.searchQuery.length > 0) {
      searchQuery.value = parsed.searchQuery
      debouncedQuery.value = parsed.searchQuery
      searchOpen.value = true
    }
  } catch {
    // Persistence is best-effort; corrupt JSON or unavailable storage falls back to defaults.
  }
}

// FT-025 ER-03: call loadStoredView synchronously in <script setup> so the
// first render reflects restored state. Moving it out of onMounted prevents
// a 1-frame flicker where the default (empty) filter would be applied.
loadStoredView()

function persistView() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rangeDays: rangeDays.value,
        specialMode: specialMode.value,
        searchQuery: searchQuery.value,
      }),
    )
  } catch {
    // Ignore — best-effort.
  }
}

watch(rangeDays, () => {
  persistView()
  loadData()
})
watch(specialMode, () => persistView())
watch(searchQuery, () => persistView())
watch(anchorDate, () => loadData())

// Refetch on tab focus (visibilitychange).
function onVisibilityChange() {
  if (!document.hidden) loadData()
}

onMounted(() => {
  // loadStoredView is invoked synchronously in setup above (FT-025 ER-03)
  // so the first render already reflects restored state.
  loadData()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  // FT-025 FM-08: cancel pending debounced setter so it doesn't fire after
  // the component is torn down (would trigger a Vue warning and stale state).
  debouncedSetQuery.cancel()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

defineExpose({
  rangeDays, anchorDate, specialMode, viewStart, viewEnd, reservations, units, loading, error,
  tooltip, contextMenu, snackbar, jumpDate, datePickerOpen, timelineEl,
  // FT-025 search state (exposed for tests + future keyboard-shortcut integration).
  searchQuery, debouncedQuery, searchOpen, filteredUnits, filteredReservations,
  loadData, goToday, onJumpDate, onShowBooking, onShowTooltip, onHideTooltip, onContextMenu,
  contextEdit, contextCheckIn, contextCheckOut, contextCancel, toggleHandover, toggleOverdue, toggleIdle, toggleHeatmap, setSpecialMode,
  onOpenSearch, onSearchEscape,
})
</script>
