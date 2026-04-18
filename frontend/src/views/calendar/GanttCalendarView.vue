<template>
  <div class="max-w-[1600px] mx-auto px-4 py-4">
    <!-- FT-026: toolbar split into 3 clusters for visual hierarchy. -->
    <div class="gantt-toolbar">
      <h1 class="gantt-toolbar__title">{{ $t('calendar.title') }}</h1>
      <div class="flex-1" />

      <!-- Group 1: view-config range toggle -->
      <div class="gantt-toolbar__group" data-testid="toolbar-group-view-config" role="radiogroup">
        <button
          v-for="r in SUPPORTED_RANGES"
          :key="r"
          type="button"
          role="radio"
          :aria-checked="rangeDays === r"
          :class="['gantt-range-btn', rangeDays === r ? 'is-active' : '']"
          @click="rangeDays = r"
        >
          {{ $t(`calendar.gantt.toolbar.range${r}`) }}
        </button>
      </div>

      <!-- Group 2: modes — expanded on lgAndUp, collapsed menu otherwise -->
      <div class="gantt-toolbar__group" data-testid="toolbar-group-modes">
        <template v-if="lgAndUp">
          <button
            v-for="mode in MODE_BUTTONS"
            :key="mode.value"
            type="button"
            :class="[
              'gantt-mode-btn',
              specialMode === mode.value ? 'gantt-mode-btn--active' : '',
            ]"
            :data-testid="`${mode.value}-btn`"
            @click="setSpecialMode(mode.value)"
          >
            <i :class="['pi', mode.icon]" aria-hidden="true" />
            <span>{{ $t(`calendar.gantt.modes.${mode.value}`) }}</span>
          </button>
        </template>
        <template v-else>
          <button
            ref="modesMenuBtn"
            type="button"
            :class="['gantt-mode-btn', specialMode ? 'gantt-mode-btn--active' : '']"
            data-testid="modes-menu-btn"
            @click="toggleModesMenu"
          >
            <i class="pi pi-th-large" aria-hidden="true" />
            <span>{{ specialMode ? $t(`calendar.gantt.modes.${specialMode}`) : $t('calendar.gantt.modes.groupLabel') }}</span>
            <i class="pi pi-chevron-down text-xs opacity-60" aria-hidden="true" />
          </button>
          <Menu ref="modesMenu" :model="modeMenuItems" :popup="true" />
        </template>
      </div>

      <!-- Group 3: utilities (search + today + jump + refresh + density) -->
      <div class="gantt-toolbar__group" data-testid="toolbar-group-utilities">
        <!-- FT-025 search (collapsible) -->
        <template v-if="searchOpen">
          <InputText
            ref="searchInputEl"
            v-model="searchQuery"
            :placeholder="$t('calendar.gantt.search.placeholder')"
            :maxlength="100"
            size="small"
            style="max-width: 240px"
            data-testid="search-input"
            autofocus
            @keydown.esc="onSearchEscape"
          />
        </template>
        <button
          v-else
          ref="searchBtnEl"
          type="button"
          class="gantt-util-btn"
          :title="`${$t('calendar.gantt.search.open')} (/)`"
          :aria-label="$t('calendar.gantt.search.open')"
          data-testid="search-btn"
          @click="onOpenSearch"
        >
          <i class="pi pi-search" aria-hidden="true" />
          <kbd aria-hidden="true" class="gantt-toolbar__kbd" data-testid="kbd-search">/</kbd>
        </button>

        <button
          type="button"
          class="gantt-util-btn"
          :title="`${$t('calendar.gantt.toolbar.today')} (T)`"
          data-testid="today-btn"
          @click="goToday"
        >
          <i class="pi pi-calendar" aria-hidden="true" />
          <span>{{ $t('calendar.gantt.toolbar.today') }}</span>
          <kbd aria-hidden="true" class="gantt-toolbar__kbd" data-testid="kbd-today">T</kbd>
        </button>

        <button
          ref="jumpBtnEl"
          type="button"
          class="gantt-util-btn"
          :title="$t('calendar.gantt.toolbar.jumpToDate')"
          data-testid="jump-btn"
          @click="toggleJumpDatePicker"
        >
          <i class="pi pi-calendar-plus" aria-hidden="true" />
        </button>
        <DatePicker
          v-if="datePickerOpen"
          v-model="jumpDate"
          :inline="false"
          :show-icon="false"
          class="gantt-jump-picker"
          @update:model-value="onJumpDate"
        />

        <button
          type="button"
          class="gantt-util-btn"
          :title="$t('calendar.gantt.toolbar.refresh')"
          data-testid="refresh-btn"
          :disabled="loading"
          @click="loadData"
        >
          <i :class="['pi pi-refresh', loading ? 'pi-spin' : '']" aria-hidden="true" />
        </button>

        <!-- FT-033: density toggle -->
        <button
          type="button"
          :class="['gantt-util-btn', density === 'compact' ? 'is-active' : '']"
          :title="`${$t('calendar.gantt.density.toggle')} (D)`"
          :aria-label="$t('calendar.gantt.density.toggle')"
          :aria-pressed="density === 'compact'"
          data-testid="density-btn"
          @click="toggleDensity"
        >
          <i class="pi pi-bars" aria-hidden="true" />
          <kbd aria-hidden="true" class="gantt-toolbar__kbd" data-testid="kbd-density">D</kbd>
        </button>
      </div>
    </div>

    <div v-if="loading" class="h-0.5 bg-primary-500 animate-pulse mb-2" />
    <div
      v-if="error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-2"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span class="flex-1">{{ error }}</span>
      <button type="button" :aria-label="$t('common.close')" class="text-red-500 hover:text-red-700" @click="error = null">
        <i class="pi pi-times" />
      </button>
    </div>

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

    <!-- FT-025 / FT-028: empty state for search -->
    <div
      v-else-if="!loading && debouncedQuery && units.length"
      class="text-center py-16 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
      data-testid="search-empty-state"
    >
      <i class="pi pi-search text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('calendar.gantt.search.empty', { query: debouncedQuery }) }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('calendar.gantt.search.emptyHint') }}
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors text-sm font-medium"
        :aria-label="$t('calendar.gantt.search.clear')"
        data-testid="search-empty-clear"
        @click="onSearchEscape"
      >
        <i class="pi pi-times" aria-hidden="true" />
        {{ $t('calendar.gantt.search.clear') }}
      </button>
    </div>

    <!-- FT-028: no-data empty state -->
    <div
      v-else-if="!loading"
      class="text-center py-16 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
      data-testid="calendar-empty-state"
    >
      <i class="pi pi-calendar text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('calendar.emptyState.title') }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('calendar.emptyState.text') }}
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
        data-testid="calendar-empty-cta"
        @click="onEmptyStateCta"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('calendar.emptyState.cta') }}
      </button>
    </div>

    <GanttTooltip :booking="tooltip.booking" :visible="tooltip.visible" :x="tooltip.x" :y="tooltip.y" />

    <!-- Context menu — PrimeVue Menu positioned via show(event) -->
    <Menu ref="contextMenuEl" :model="contextMenuItems" :popup="true" />

    <!-- FT-029: keyboard shortcuts help dialog -->
    <Dialog
      v-model:visible="helpOpen"
      :header="$t('calendar.gantt.shortcuts.title')"
      modal
      :style="{ width: '480px' }"
      data-testid="shortcuts-dialog"
    >
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('calendar.gantt.shortcuts.caption') }}
      </p>
      <table class="gantt-shortcuts__table">
        <tbody>
          <tr v-for="row in shortcutRows" :key="row.key">
            <td class="gantt-shortcuts__kbd-cell">
              <kbd class="gantt-shortcuts__kbd">{{ row.key }}</kbd>
            </td>
            <td class="gantt-shortcuts__label">{{ $t(row.label) }}</td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <Button
          ref="helpCloseBtnEl"
          :label="$t('calendar.gantt.shortcuts.close')"
          severity="secondary"
          variant="text"
          autofocus
          data-testid="shortcuts-close"
          @click="helpOpen = false"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Menu from 'primevue/menu'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DatePicker from 'primevue/datepicker'
import GanttTimeline from './GanttTimeline.vue'
import GanttTooltip from './GanttTooltip.vue'
import * as reservationsApi from '../../api/reservations'
import * as allUnitsApi from '../../api/allUnits'
import { addDays, startOfDay, formatIsoDate, parseIsoDate } from '../../utils/date'
import { debounce } from '../../utils/debounce'
import { filterUnitsAndReservations } from '../../utils/search'
import { useGanttShortcuts } from '../../composables/useGanttShortcuts'
import { useBreakpoint } from '../../composables/useBreakpoint'

// FT-036 P5: replaced Vuetify useDisplay. `lgAndUp` = ≥ 1280px per original convention.
const { lgAndUp } = useBreakpoint()

// FT-026: mode button registry. Icons swapped MDI → PrimeIcons.
const MODE_BUTTONS = [
  { value: 'handover', icon: 'pi-arrows-h' },
  { value: 'overdue', icon: 'pi-exclamation-circle' },
  { value: 'idle', icon: 'pi-clock' },
  { value: 'heatmap', icon: 'pi-th-large' },
]

const SEARCH_DEBOUNCE_MS = 200
const STORAGE_KEY = 'apartus-calendar-view'
const DEFAULT_RANGE_DAYS = 14
const SUPPORTED_RANGES = [7, 14, 30]
const SUPPORTED_SPECIAL_MODES = ['', 'handover', 'overdue', 'idle', 'heatmap']
const SUPPORTED_DENSITIES = ['comfortable', 'compact']

const { t } = useI18n()
const router = useRouter()
const toast = useToast()

const rangeDays = ref(DEFAULT_RANGE_DAYS)
const anchorDate = ref(startOfDay(new Date()))
const specialMode = ref('')
const reservations = ref([])
const units = ref([])
const loading = ref(false)
const error = ref(null)
const timelineEl = ref(null)

// FT-025 search state
const searchInputEl = ref(null)
const helpOpen = ref(false)
const helpCloseBtnEl = ref(null)
const sidebarCollapsed = ref(false)
const density = ref('comfortable')
const searchQuery = ref('')
const debouncedQuery = ref('')
const searchOpen = ref(false)
const searchBtnEl = ref(null)

// Menus
const modesMenu = ref(null)
const modesMenuBtn = ref(null)
const contextMenuEl = ref(null)
const jumpBtnEl = ref(null)

function setSpecialMode(mode) {
  specialMode.value = specialMode.value === mode ? '' : mode
}

function toggleHandover() { setSpecialMode('handover') }
function toggleOverdue() { setSpecialMode('overdue') }
function toggleIdle() { setSpecialMode('idle') }
function toggleHeatmap() { setSpecialMode('heatmap') }

const viewStart = computed(() => anchorDate.value)
const viewEnd = computed(() => addDays(anchorDate.value, rangeDays.value - 1))

const filtered = computed(() =>
  filterUnitsAndReservations(units.value, reservations.value, debouncedQuery.value),
)
const filteredUnits = computed(() => filtered.value.units)
const filteredReservations = computed(() => filtered.value.reservations)

const debouncedSetQuery = debounce((q) => {
  debouncedQuery.value = q
}, SEARCH_DEBOUNCE_MS)

watch(searchQuery, (q) => {
  if (q === null || q === undefined) {
    searchQuery.value = ''
    return
  }
  debouncedSetQuery(q)
})

function onOpenSearch() {
  searchOpen.value = true
}

function onEmptyStateCta() {
  router.push('/properties/new')
}

async function onSearchEscape() {
  searchQuery.value = ''
  debouncedSetQuery.cancel()
  debouncedQuery.value = ''
  searchOpen.value = false
  await nextTick()
  if (searchBtnEl.value?.focus) searchBtnEl.value.focus()
}

async function focusSearchInput() {
  if (!searchOpen.value) searchOpen.value = true
  await nextTick()
  const vm = searchInputEl.value
  if (vm?.$el?.querySelector) vm.$el.querySelector('input')?.focus()
  else if (vm?.focus) vm.focus()
}

function shiftRange(direction) {
  anchorDate.value = addDays(anchorDate.value, direction * rangeDays.value)
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function toggleDensity() {
  density.value = density.value === 'compact' ? 'comfortable' : 'compact'
}

function toggleModesMenu(event) {
  modesMenu.value?.toggle(event)
}

// FT-036 P5: modes menu built as PrimeVue MenuItem[]
const modeMenuItems = computed(() =>
  MODE_BUTTONS.map((mode) => ({
    label: t(`calendar.gantt.modes.${mode.value}`),
    icon: `pi ${mode.icon}`,
    class: specialMode.value === mode.value ? 'is-active' : '',
    command: () => setSpecialMode(mode.value),
  })),
)

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

// Context menu state (PrimeVue Menu positioned at cursor via show(event))
const contextMenu = ref({ open: false, booking: null, x: 0, y: 0 })

const contextMenuItems = computed(() => {
  const booking = contextMenu.value.booking
  if (!booking) return []
  const items = [
    {
      label: t('calendar.gantt.contextMenu.edit'),
      icon: 'pi pi-pencil',
      command: contextEdit,
    },
  ]
  if (booking.status === 'confirmed') {
    items.push({
      label: t('calendar.gantt.contextMenu.checkIn'),
      icon: 'pi pi-sign-in',
      command: contextCheckIn,
    })
  }
  if (booking.status === 'checked_in') {
    items.push({
      label: t('calendar.gantt.contextMenu.checkOut'),
      icon: 'pi pi-sign-out',
      command: contextCheckOut,
    })
  }
  if (booking.status !== 'cancelled' && booking.status !== 'checked_out') {
    items.push({
      label: t('calendar.gantt.contextMenu.cancel'),
      icon: 'pi pi-ban',
      command: contextCancel,
    })
  }
  return items
})

function onContextMenu(payload) {
  onHideTooltip()
  contextMenu.value = { open: true, booking: payload.booking, x: payload.x, y: payload.y }
  // Position PrimeVue Menu at cursor coordinates via synthetic event
  const syntheticEvent = {
    currentTarget: document.body,
    target: document.body,
    clientX: payload.x,
    clientY: payload.y,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  nextTick(() => {
    contextMenuEl.value?.show(syntheticEvent)
  })
}

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
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: t('calendar.gantt.errors.checkInFailed'), life: 3000 })
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
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: t('calendar.gantt.errors.checkOutFailed'), life: 3000 })
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
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: t('calendar.gantt.errors.cancelFailed'), life: 3000 })
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
function toggleJumpDatePicker() {
  datePickerOpen.value = !datePickerOpen.value
}
function onJumpDate(picked) {
  if (!picked) return
  const d = picked instanceof Date ? picked : parseIsoDate(picked)
  anchorDate.value = startOfDay(d)
  datePickerOpen.value = false
  if (timelineEl.value) timelineEl.value.scrollToDate(d)
}

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
    if (import.meta.env.DEV) console.error('[gantt] loadData failed:', e)
    error.value = t('calendar.gantt.errors.loadFailed')
  } finally {
    loading.value = false
  }
}

// localStorage round-trip (FT-025 ER-03 + FT-030 + FT-033)
function loadStoredView() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw)
    if (SUPPORTED_RANGES.includes(parsed.rangeDays)) rangeDays.value = parsed.rangeDays
    if (typeof parsed.specialMode === 'string' && SUPPORTED_SPECIAL_MODES.includes(parsed.specialMode)) {
      specialMode.value = parsed.specialMode
    }
    if (typeof parsed.searchQuery === 'string' && parsed.searchQuery.length > 0) {
      searchQuery.value = parsed.searchQuery
      debouncedQuery.value = parsed.searchQuery
      searchOpen.value = true
    }
    if (typeof parsed.sidebarCollapsed === 'boolean') {
      sidebarCollapsed.value = parsed.sidebarCollapsed
    }
    if (typeof parsed.density === 'string' && SUPPORTED_DENSITIES.includes(parsed.density)) {
      density.value = parsed.density
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[gantt] loadStoredView: ignoring persisted state', err)
  }
}

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
    if (import.meta.env.DEV) console.warn('[gantt] persistView: could not write state', err)
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

function onVisibilityChange() {
  if (!document.hidden) loadData()
}

onMounted(() => {
  loadData()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  debouncedSetQuery.cancel()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

// Compat alias for tests that referenced `display.lgAndUp.value`
const display = computed(() => ({ lgAndUp: { value: lgAndUp.value } }))

defineExpose({
  rangeDays, anchorDate, specialMode, viewStart, viewEnd, reservations, units, loading, error,
  tooltip, contextMenu, jumpDate, datePickerOpen, timelineEl,
  searchQuery, debouncedQuery, searchOpen, filteredUnits, filteredReservations,
  loadData, goToday, onJumpDate, onShowBooking, onShowTooltip, onHideTooltip, onContextMenu,
  contextEdit, contextCheckIn, contextCheckOut, contextCancel,
  toggleHandover, toggleOverdue, toggleIdle, toggleHeatmap, setSpecialMode,
  onOpenSearch, onSearchEscape, onEmptyStateCta,
  display, lgAndUp, MODE_BUTTONS,
  helpOpen, shortcutRows, focusSearchInput, shiftRange,
  sidebarCollapsed, toggleSidebar,
  density, toggleDensity,
  contextMenuItems, modeMenuItems,
})
</script>

<style scoped>
.gantt-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.gantt-toolbar__title {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  margin-right: 12px;
  color: var(--p-surface-900, #171c19);
}

:where(.dark) .gantt-toolbar__title {
  color: var(--p-surface-0, #e1e6e2);
}

.gantt-toolbar__group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Range toggle buttons — segmented control pattern */
.gantt-range-btn {
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: var(--p-surface-700, #4a5048);
  border: 1px solid rgba(0, 0, 0, 0.12);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.gantt-range-btn + .gantt-range-btn {
  border-left: 0;
}

.gantt-range-btn:first-child { border-radius: 6px 0 0 6px; }
.gantt-range-btn:last-child { border-radius: 0 6px 6px 0; }

.gantt-range-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.gantt-range-btn.is-active {
  background: color-mix(in oklch, var(--color-primary-500) 12%, transparent);
  color: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

:where(.dark) .gantt-range-btn {
  color: var(--p-surface-200, #b9c0bb);
  border-color: rgba(255, 255, 255, 0.12);
}

:where(.dark) .gantt-range-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

/* Mode + utility buttons */
.gantt-mode-btn,
.gantt-util-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  color: var(--p-surface-800, #35392f);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  overflow: visible;
  transition: background 0.15s, color 0.15s;
}

.gantt-util-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

:where(.dark) .gantt-mode-btn,
:where(.dark) .gantt-util-btn {
  color: var(--p-surface-100, #d0d5d1);
}

.gantt-mode-btn:hover,
.gantt-util-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

:where(.dark) .gantt-mode-btn:hover,
:where(.dark) .gantt-util-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.gantt-mode-btn:focus-visible,
.gantt-util-btn:focus-visible,
.gantt-range-btn:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* FT-026/033 active state — tonal tint, not primary CTA */
.gantt-mode-btn--active,
.gantt-util-btn.is-active {
  background: color-mix(in oklch, var(--color-primary-500) 12%, transparent);
  color: var(--color-primary-500);
  font-weight: 600;
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
  background: rgba(0, 0, 0, 0.08);
  color: var(--p-surface-900, #171c19);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

:where(.dark) .gantt-shortcuts__kbd {
  background: rgba(255, 255, 255, 0.08);
  color: var(--p-surface-0, #e1e6e2);
  border-color: rgba(255, 255, 255, 0.15);
}

.gantt-shortcuts__label {
  color: var(--p-surface-900, #171c19);
}

:where(.dark) .gantt-shortcuts__label {
  color: var(--p-surface-0, #e1e6e2);
}

/* FT-034: inline shortcut badges on toolbar buttons */
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
  color: rgba(0, 0, 0, 0.7);
  background: rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 3px;
  flex-shrink: 0;
  pointer-events: none;
}

:where(.dark) .gantt-toolbar__kbd {
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.gantt-jump-picker {
  position: absolute;
  z-index: 100;
}

@keyframes pi-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.pi-spin {
  animation: pi-spin 1s linear infinite;
}
</style>
