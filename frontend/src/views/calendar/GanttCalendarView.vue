<template>
  <v-container fluid class="pa-4">
    <!-- FT-026: toolbar split into 3 clusters for visual hierarchy.
         1. view-config (range) — how much we show
         2. modes (handover/overdue/idle/heatmap) — what we highlight
         3. utilities (search/today/jump/refresh) — navigation + refresh
         Active mode uses `variant="tonal"` (subtle tinted bg) — NOT elevated
         primary — so primary color stays reserved for true CTAs. -->
    <div class="gantt-toolbar">
      <h1 class="gantt-toolbar__title text-h5">{{ $t('calendar.title') }}</h1>
      <v-spacer />

      <!-- Group 1: view-config -->
      <div class="gantt-toolbar__group" data-testid="toolbar-group-view-config">
        <v-btn-toggle v-model="rangeDays" mandatory density="comfortable" variant="outlined" color="primary">
          <v-btn :value="7">{{ $t('calendar.gantt.toolbar.range7') }}</v-btn>
          <v-btn :value="14">{{ $t('calendar.gantt.toolbar.range14') }}</v-btn>
          <v-btn :value="30">{{ $t('calendar.gantt.toolbar.range30') }}</v-btn>
        </v-btn-toggle>
      </div>

      <!-- Group 2: modes — expanded row on lgAndUp, collapsed v-menu otherwise -->
      <div class="gantt-toolbar__group" data-testid="toolbar-group-modes">
        <template v-if="display.lgAndUp.value">
          <v-btn
            v-for="mode in MODE_BUTTONS"
            :key="mode.value"
            :prepend-icon="mode.icon"
            :variant="specialMode === mode.value ? 'tonal' : 'text'"
            :class="{ 'gantt-mode-btn--active': specialMode === mode.value }"
            :data-testid="`${mode.value}-btn`"
            @click="setSpecialMode(mode.value)"
          >
            {{ $t(`calendar.gantt.modes.${mode.value}`) }}
          </v-btn>
        </template>
        <v-menu v-else location="bottom end" :close-on-content-click="true">
          <template v-slot:activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              prepend-icon="mdi-view-dashboard-variant"
              append-icon="mdi-menu-down"
              :variant="specialMode ? 'tonal' : 'text'"
              :class="{ 'gantt-mode-btn--active': !!specialMode }"
              data-testid="modes-menu-btn"
            >
              {{ specialMode ? $t(`calendar.gantt.modes.${specialMode}`) : $t('calendar.gantt.modes.groupLabel') }}
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="mode in MODE_BUTTONS"
              :key="mode.value"
              :prepend-icon="mode.icon"
              :title="$t(`calendar.gantt.modes.${mode.value}`)"
              :active="specialMode === mode.value"
              :data-testid="`${mode.value}-menu-item`"
              @click="setSpecialMode(mode.value)"
            />
          </v-list>
        </v-menu>
      </div>

      <!-- Group 3: utilities (search + today + jump + refresh) -->
      <div class="gantt-toolbar__group" data-testid="toolbar-group-utilities">
        <!-- FT-025 search (collapsible) -->
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
          variant="text"
          :title="`${$t('calendar.gantt.search.open')} (/)`"
          :aria-label="$t('calendar.gantt.search.open')"
          data-testid="search-btn"
          @click="onOpenSearch"
        >
          <v-icon>mdi-magnify</v-icon>
          <kbd aria-hidden="true" class="gantt-toolbar__kbd" data-testid="kbd-search">/</kbd>
        </v-btn>

        <v-btn
          variant="text"
          prepend-icon="mdi-calendar-today"
          :title="`${$t('calendar.gantt.toolbar.today')} (T)`"
          @click="goToday"
          data-testid="today-btn"
        >
          {{ $t('calendar.gantt.toolbar.today') }}
          <kbd aria-hidden="true" class="gantt-toolbar__kbd" data-testid="kbd-today">T</kbd>
        </v-btn>

        <v-menu v-model="datePickerOpen" :close-on-content-click="false" location="bottom end">
          <template v-slot:activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon="mdi-calendar-arrow-right" variant="text" :title="$t('calendar.gantt.toolbar.jumpToDate')" data-testid="jump-btn" />
          </template>
          <v-date-picker v-model="jumpDate" hide-header @update:model-value="onJumpDate" />
        </v-menu>

        <v-btn icon="mdi-refresh" variant="text" :loading="loading" @click="loadData" :title="$t('calendar.gantt.toolbar.refresh')" data-testid="refresh-btn" />

        <!-- FT-033: density toggle. Tonal variant when compact (active state);
             text variant otherwise. Same active-pattern as mode buttons (FT-026).
             FT-034: inline kbd badge peripherally advertises the D shortcut. -->
        <v-btn
          :variant="density === 'compact' ? 'tonal' : 'text'"
          :title="`${$t('calendar.gantt.density.toggle')} (D)`"
          :aria-label="$t('calendar.gantt.density.toggle')"
          :aria-pressed="density === 'compact'"
          data-testid="density-btn"
          @click="toggleDensity"
        >
          <v-icon>mdi-format-line-spacing</v-icon>
          <kbd aria-hidden="true" class="gantt-toolbar__kbd" data-testid="kbd-density">D</kbd>
        </v-btn>
      </div>
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
      :sidebar-collapsed="sidebarCollapsed"
      :density="density"
      @toggle-sidebar="toggleSidebar"
      @show-booking="onShowBooking"
      @show-tooltip="onShowTooltip"
      @hide-tooltip="onHideTooltip"
      @context-menu="onContextMenu"
    />

    <!-- FT-025 / FT-028: empty state for search (query non-empty but no
         matches). Teaching UX — subtext explains what search matches, inline
         Clear button returns the view to full listing. -->
    <v-empty-state
      v-else-if="!loading && debouncedQuery && units.length"
      icon="mdi-magnify-close"
      :title="$t('calendar.gantt.search.empty', { query: debouncedQuery })"
      :text="$t('calendar.gantt.search.emptyHint')"
      data-testid="search-empty-state"
    >
      <template #actions>
        <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-close"
          data-testid="search-empty-clear"
          :aria-label="$t('calendar.gantt.search.clear')"
          @click="onSearchEscape"
        >
          {{ $t('calendar.gantt.search.clear') }}
        </v-btn>
      </template>
    </v-empty-state>

    <!-- FT-028: no-data empty state with inline CTA to add first property. -->
    <v-empty-state
      v-else-if="!loading"
      icon="mdi-calendar-blank"
      :title="$t('calendar.emptyState.title')"
      :text="$t('calendar.emptyState.text')"
      data-testid="calendar-empty-state"
    >
      <template #actions>
        <v-btn
          variant="tonal"
          color="primary"
          prepend-icon="mdi-plus"
          data-testid="calendar-empty-cta"
          @click="onEmptyStateCta"
        >
          {{ $t('calendar.emptyState.cta') }}
        </v-btn>
      </template>
    </v-empty-state>

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

    <!-- FT-029: keyboard shortcuts help dialog -->
    <v-dialog v-model="helpOpen" max-width="480" data-testid="shortcuts-dialog">
      <v-card>
        <v-card-title class="gantt-shortcuts__title">{{ $t('calendar.gantt.shortcuts.title') }}</v-card-title>
        <v-card-subtitle class="gantt-shortcuts__caption">{{ $t('calendar.gantt.shortcuts.caption') }}</v-card-subtitle>
        <v-card-text>
          <table class="gantt-shortcuts__table">
            <tbody>
              <tr v-for="row in shortcutRows" :key="row.key">
                <td class="gantt-shortcuts__kbd-cell"><kbd class="gantt-shortcuts__kbd">{{ row.key }}</kbd></td>
                <td class="gantt-shortcuts__label">{{ $t(row.label) }}</td>
              </tr>
            </tbody>
          </table>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            ref="helpCloseBtnEl"
            variant="text"
            color="primary"
            autofocus
            data-testid="shortcuts-close"
            @click="helpOpen = false"
          >
            {{ $t('calendar.gantt.shortcuts.close') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import GanttTimeline from './GanttTimeline.vue'
import GanttTooltip from './GanttTooltip.vue'
import * as reservationsApi from '../../api/reservations'
import * as allUnitsApi from '../../api/allUnits'
import { addDays, startOfDay, formatIsoDate, parseIsoDate } from '../../utils/date'
import { debounce } from '../../utils/debounce'
import { filterUnitsAndReservations } from '../../utils/search'
import { useGanttShortcuts } from '../../composables/useGanttShortcuts'

// FT-026: viewport-aware mode-group collapse.
// `lgAndUp` = ≥ 1280px per Vuetify 4 breakpoints. Below that, the 4 mode
// buttons collapse into a single dropdown to free toolbar horizontal space.
const display = useDisplay()

// FT-026: mode button registry — driven by the same data as before. Keeping
// this inline (not in a separate module) because it's tightly coupled to
// i18n keys under `calendar.gantt.modes.*` and shouldn't be reused elsewhere.
const MODE_BUTTONS = [
  { value: 'handover', icon: 'mdi-swap-horizontal' },
  { value: 'overdue', icon: 'mdi-alert-circle-outline' },
  { value: 'idle', icon: 'mdi-clock-alert-outline' },
  { value: 'heatmap', icon: 'mdi-grid' },
]

// FT-025 REQ-02: 200ms trailing-edge — Material guideline for search input
// responsiveness. Tuned per ASM-05 perf budget (50 units × 10 reservations =
// 500 items × 3 substring checks per keystroke is imperceptible under 200ms).
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
// FT-029: search input template ref — used by shortcuts composable to
// programmatically focus the field on `/`. `searchInputEl.value` is the
// Vuetify VTextField public instance; `.focus()` is a stable public API.
const searchInputEl = ref(null)
// FT-029: help dialog open state.
const helpOpen = ref(false)
const helpCloseBtnEl = ref(null)
// FT-030: sidebar collapse state (toggle via `S` shortcut or corner button).
const sidebarCollapsed = ref(false)
// FT-033: density toggle (toggle via `D` shortcut or toolbar button).
const density = ref('comfortable')
const SUPPORTED_DENSITIES = ['comfortable', 'compact']
const searchQuery = ref('')
const debouncedQuery = ref('')
const searchOpen = ref(false)
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

// Vuetify's `clearable` X-button emits `null` (not `''`) when clicked. Coerce
// here so both refs stay typed as strings and persistence serializes a string.
watch(searchQuery, (q) => {
  if (q === null || q === undefined) {
    searchQuery.value = ''
    return // the re-assignment above will re-fire this watcher with ''
  }
  debouncedSetQuery(q)
})

function onOpenSearch() {
  searchOpen.value = true
  // Autofocus на v-text-field открывает input focused. Collapse происходит
  // только по Escape (явное действие) — случайный blur (например клик по
  // бару календаря) не закрывает поиск, иначе activity-фильтр терялся бы
  // при первом же взаимодействии с календарём.
}

// FT-028: no-data empty state CTA — route to properties/new for onboarding.
// Smart dispatch (properties vs units vs reservations) deferred per NS-05.
function onEmptyStateCta() {
  router.push('/properties/new')
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

// FT-029: keyboard shortcuts wiring.
// `focusSearchInput` handles the `/` shortcut — opens the collapsible bar
// if closed, waits for the input to mount, then focuses it. `shiftRange`
// is `[` / `]` panning by current range.
async function focusSearchInput() {
  if (!searchOpen.value) searchOpen.value = true
  await nextTick()
  // VTextField exposes `.focus()` as a public method; fall back to the
  // inner <input> via $el in case we're mid-transition.
  const vm = searchInputEl.value
  if (vm?.focus) vm.focus()
  else vm?.$el?.querySelector?.('input')?.focus()
}

function shiftRange(direction) {
  anchorDate.value = addDays(anchorDate.value, direction * rangeDays.value)
}

// FT-030: sidebar collapse toggle — also bound to `S` shortcut.
function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// FT-033: density toggle — also bound to `D` shortcut.
function toggleDensity() {
  density.value = density.value === 'compact' ? 'comfortable' : 'compact'
}

// Shortcut rows — single source of truth for the help dialog table.
const shortcutRows = [
  { key: '/', label: 'calendar.gantt.shortcuts.keys.search' },
  { key: 'T', label: 'calendar.gantt.shortcuts.keys.today' },
  { key: '[', label: 'calendar.gantt.shortcuts.keys.panPrev' },
  { key: ']', label: 'calendar.gantt.shortcuts.keys.panNext' },
  { key: 'S', label: 'calendar.gantt.shortcuts.keys.sidebar' },
  { key: 'D', label: 'calendar.gantt.shortcuts.keys.density' },
  { key: 'Esc', label: 'calendar.gantt.shortcuts.keys.clear' },
  { key: '?', label: 'calendar.gantt.shortcuts.keys.help' },
]

useGanttShortcuts({
  focusSearchInput,
  goToday,
  shiftRange,
  toggleSidebar,
  toggleDensity,
  onSearchEscape,
  helpOpen,
  searchQuery,
  searchOpen,
})

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
    // FT-030: restore sidebar collapse state. Boolean-only type guard —
    // malformed values fall back to default (expanded).
    if (typeof parsed.sidebarCollapsed === 'boolean') {
      sidebarCollapsed.value = parsed.sidebarCollapsed
    }
    // FT-033: restore density. Enum-guard — malformed → default comfortable.
    if (typeof parsed.density === 'string' && SUPPORTED_DENSITIES.includes(parsed.density)) {
      density.value = parsed.density
    }
  } catch (err) {
    // Persistence is best-effort; corrupt JSON or unavailable storage falls
    // back to defaults. Log in dev so regressions are debuggable; silent in
    // production to avoid noise in user consoles (Safari private mode, etc).
    if (import.meta.env.DEV) {
      console.warn('[gantt] loadStoredView: ignoring persisted state', err)
    }
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
        sidebarCollapsed: sidebarCollapsed.value,
        density: density.value,
      }),
    )
  } catch (err) {
    // Quota exhaustion / storage disabled — best-effort only.
    if (import.meta.env.DEV) {
      console.warn('[gantt] persistView: could not write state', err)
    }
  }
}

watch(rangeDays, () => {
  persistView()
  loadData()
})
watch(specialMode, () => persistView())
watch(searchQuery, () => persistView())
watch(sidebarCollapsed, () => persistView())
watch(density, () => persistView())
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
  onOpenSearch, onSearchEscape, onEmptyStateCta,
  display, MODE_BUTTONS,
  // FT-029
  helpOpen, shortcutRows, focusSearchInput, shiftRange,
  // FT-030
  sidebarCollapsed, toggleSidebar,
  // FT-033
  density, toggleDensity,
})
</script>

<style scoped>
/* FT-026: toolbar rhythm. Three clusters separated by an invisible spacer
   plus subtle vertical divider suggestion (via gap + group padding). */
.gantt-toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-md, 16px);
  margin-bottom: var(--space-md, 16px);
  flex-wrap: wrap;
}

.gantt-toolbar__title {
  font-family: var(--font-display);
  letter-spacing: var(--tracking-tight);
  margin-right: var(--space-sm, 12px);
}

.gantt-toolbar__group {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 8px);
}

/* Active-mode styling: tonal variant + bold weight. Underlines the active
   mode subtly without claiming the primary-CTA color weight. */
:deep(.gantt-mode-btn--active) {
  font-weight: 600;
}

:deep(.gantt-mode-btn--active .v-btn__overlay) {
  opacity: 0.12;
}

/* FT-029: keyboard shortcuts help dialog. */
.gantt-shortcuts__table {
  width: 100%;
  border-collapse: collapse;
}

.gantt-shortcuts__table td {
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.4;
}

.gantt-shortcuts__kbd-cell {
  width: 80px;
}

.gantt-shortcuts__kbd {
  display: inline-block;
  min-width: 28px;
  padding: 2px 8px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 4px;
}

/* FT-034: inline shortcut badges on toolbar buttons. Smaller + muted vs
   the help-dialog kbd style. Sits after icon / label inside the button. */
.gantt-toolbar__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  margin-left: 6px;
  padding: 0 4px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  color: rgba(var(--v-theme-on-surface), 0.7);
  background: rgba(var(--v-theme-on-surface), 0.08);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.15);
  border-radius: 3px;
  flex-shrink: 0;
  pointer-events: none;
}

.gantt-shortcuts__label {
  color: rgb(var(--v-theme-on-surface));
}
</style>
