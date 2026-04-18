<template>
  <div class="gantt-timeline" :class="{ 'gantt-timeline--sidebar-collapsed': sidebarCollapsed }">
    <!-- Sticky-left header corner — toggle button when collapsed, label otherwise -->
    <div class="gantt-timeline__corner">
      <v-btn
        variant="text"
        size="small"
        density="compact"
        :icon="sidebarCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left'"
        :title="`${sidebarCollapsed ? $t('calendar.gantt.sidebar.toggleExpand') : $t('calendar.gantt.sidebar.toggleCollapse')} (S)`"
        :aria-label="sidebarCollapsed ? $t('calendar.gantt.sidebar.toggleExpand') : $t('calendar.gantt.sidebar.toggleCollapse')"
        :aria-expanded="!sidebarCollapsed"
        aria-controls="gantt-sidebar"
        data-testid="sidebar-toggle"
        @click="$emit('toggle-sidebar')"
      />
      <span v-if="!sidebarCollapsed" class="gantt-timeline__corner-label">{{ $t('calendar.unitColumn') }}</span>
    </div>

    <!-- Sticky-left unit column -->
    <div id="gantt-sidebar" class="gantt-timeline__sidebar">
      <div
        v-for="unit in units"
        :key="unit.id"
        class="gantt-timeline__unit-cell"
        :style="{ height: (rowHeights[unit.id] || baseRowHeight) + 'px' }"
        :title="`${unit.property_name} — ${unit.name}`"
      >
        <template v-if="sidebarCollapsed">
          <div class="gantt-timeline__unit-abbr">{{ abbreviateUnit(unit.name) }}</div>
        </template>
        <template v-else>
          <div class="gantt-timeline__unit-property">{{ unit.property_name }}</div>
          <div class="gantt-timeline__unit-name">{{ unit.name }}</div>
        </template>
      </div>
    </div>

    <!-- Scrollable timeline -->
    <div class="gantt-timeline__scroll" ref="scrollEl">
      <div class="gantt-timeline__inner" :style="{ width: totalWidth + 'px', position: 'relative' }">
        <GanttTimelineHeader
          :view-start="viewStart"
          :view-end="viewEnd"
          :pixels-per-ms="pixelsPerMs"
          :total-width="totalWidth"
        />

        <div class="gantt-timeline__rows">
          <GanttTimelineRow
            v-for="unit in units"
            :key="unit.id"
            :unit="unit"
            :bookings="reservations"
            :view-start="viewStart"
            :view-end="viewEnd"
            :pixels-per-ms="pixelsPerMs"
            :total-width="totalWidth"
            :base-row-height="baseRowHeight"
            :item-height="itemHeight"
            :special-mode="specialMode"
            @show-booking="$emit('show-booking', $event)"
            @show-tooltip="$emit('show-tooltip', $event)"
            @hide-tooltip="$emit('hide-tooltip')"
            @context-menu="$emit('context-menu', $event)"
            @row-height-changed="onRowHeightChanged"
          />
        </div>

        <!-- FT-032: Today column anchor — full-height primary-tint background
             highlighting today. Sits behind rows (z-index 0) so items, heat
             cells, idle gaps all paint on top. pointer-events none. -->
        <div
          v-if="todayInRange"
          class="gantt-timeline__today-column"
          :style="{ left: todayLeft + 'px', width: dayWidthPx + 'px' }"
          :aria-label="$t('calendar.gantt.todayColumnAriaLabel')"
          role="presentation"
          data-testid="today-column"
        />

        <!-- Today marker (thin vertical line — FT-020 baseline) -->
        <div
          v-if="todayInRange"
          class="gantt-timeline__today-marker"
          :style="{ left: todayLeft + 'px' }"
          data-testid="today-marker"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import GanttTimelineHeader from './GanttTimelineHeader.vue'
import GanttTimelineRow from './GanttTimelineRow.vue'
import { dateToPixel } from '../../utils/gantt'
import { startOfDay } from '../../utils/date'
import { abbreviateUnit } from '../../utils/strings'

const MS_PER_DAY = 86_400_000
const DEFAULT_VIEWPORT_WIDTH = 1200
const MIN_DAY_PX = 40

const props = defineProps({
  units: { type: Array, default: () => [] },
  reservations: { type: Array, default: () => [] },
  viewStart: { type: Date, required: true },
  viewEnd: { type: Date, required: true },
  baseRowHeight: { type: Number, default: 36 },
  itemHeight: { type: Number, default: 28 },
  specialMode: { type: String, default: '' },
  // FT-030: collapsed sidebar — narrows to 48px and shows 2-letter
  // abbreviations instead of property+unit name.
  sidebarCollapsed: { type: Boolean, default: false },
})

defineEmits(['show-booking', 'show-tooltip', 'hide-tooltip', 'context-menu', 'toggle-sidebar'])

const scrollEl = ref(null)
const viewportWidth = ref(DEFAULT_VIEWPORT_WIDTH)

// rangeMs is total range duration in ms.
const rangeMs = computed(() => Math.max(MS_PER_DAY, props.viewEnd.valueOf() - props.viewStart.valueOf() + MS_PER_DAY))

// pixelsPerMs derived so that each day cell is at least MIN_DAY_PX wide.
// If viewport is wider than days * MIN_DAY_PX, expand to fill.
const pixelsPerMs = computed(() => {
  const days = rangeMs.value / MS_PER_DAY
  const minTotalWidth = days * MIN_DAY_PX
  const totalWidth = Math.max(viewportWidth.value, minTotalWidth)
  return totalWidth / rangeMs.value
})

const totalWidth = computed(() => pixelsPerMs.value * rangeMs.value)

const todayInRange = computed(() => {
  const today = startOfDay(new Date()).valueOf()
  return today >= props.viewStart.valueOf() && today <= props.viewEnd.valueOf()
})

const todayLeft = computed(() => dateToPixel(startOfDay(new Date()), props.viewStart, pixelsPerMs.value))

// FT-032: width of a single day column in pixels — used for today column tint.
const dayWidthPx = computed(() => pixelsPerMs.value * MS_PER_DAY)

// Track row heights for sidebar sync. Row emits row-height-changed when
// its computedRowHeight changes (lanes can grow rows beyond baseRowHeight).
const rowHeights = ref({})
function onRowHeightChanged({ unitId, height }) {
  if (rowHeights.value[unitId] === height) return
  rowHeights.value = { ...rowHeights.value, [unitId]: height }
}

function updateViewport() {
  if (scrollEl.value) viewportWidth.value = scrollEl.value.clientWidth || DEFAULT_VIEWPORT_WIDTH
}

function scrollToToday() {
  if (!scrollEl.value || !todayInRange.value) return
  // Center today in viewport.
  scrollEl.value.scrollLeft = Math.max(0, todayLeft.value - viewportWidth.value / 2)
}

function scrollToDate(date) {
  if (!scrollEl.value) return
  const target = dateToPixel(startOfDay(date), props.viewStart, pixelsPerMs.value)
  scrollEl.value.scrollLeft = Math.max(0, target - viewportWidth.value / 2)
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  scrollToToday()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewport)
})

defineExpose({
  pixelsPerMs, totalWidth, todayInRange, todayLeft, dayWidthPx, rowHeights, onRowHeightChanged, scrollToToday, scrollToDate, updateViewport,
})
</script>

<style scoped>
.gantt-timeline {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  /* FT-030: smooth sidebar collapse transition. */
  transition: grid-template-columns 0.2s ease-out;
}

/* FT-030: collapsed — sidebar shrinks to 48px (minimal icon button width). */
.gantt-timeline--sidebar-collapsed {
  grid-template-columns: 48px 1fr;
}

@media (prefers-reduced-motion: reduce) {
  .gantt-timeline {
    transition: none;
  }
}

.gantt-timeline__corner {
  grid-column: 1;
  grid-row: 1;
  background: rgb(var(--v-theme-surface-light));
  padding: 4px 4px;
  font-weight: 600;
  font-size: 12px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 50px;
  box-sizing: border-box;
}

.gantt-timeline__corner-label {
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
}

.gantt-timeline__sidebar {
  grid-column: 1;
  grid-row: 2;
  background: rgb(var(--v-theme-surface));
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.gantt-timeline__unit-cell {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}

.gantt-timeline__unit-property {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gantt-timeline__unit-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* FT-030: abbreviation cell — centered uppercase 2-char badge. */
.gantt-timeline__unit-abbr {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  color: rgb(var(--v-theme-on-surface));
}

/* Reduce cell padding on collapsed to keep text centered in 48px. */
.gantt-timeline--sidebar-collapsed .gantt-timeline__unit-cell {
  padding: 6px 4px;
  align-items: center;
}

.gantt-timeline__scroll {
  grid-column: 2;
  grid-row: 1 / span 2;
  overflow-x: auto;
  overflow-y: visible;
}

.gantt-timeline__inner {
  position: relative;
}

.gantt-timeline__rows {
  position: relative;
}

.gantt-timeline__today-marker {
  position: absolute;
  top: 50px; /* below header */
  bottom: 0;
  width: 2px;
  background: rgb(var(--v-theme-primary));
  pointer-events: none;
  z-index: 5;
}

/* FT-032: Today column background tint — full height, whisper-level primary
   tint (~5%). Sits behind rows so items/heat-cells/gaps paint on top. */
.gantt-timeline__today-column {
  position: absolute;
  top: 50px; /* below header — aligns with marker */
  bottom: 0;
  background: rgba(var(--v-theme-primary), 0.05);
  pointer-events: none;
  z-index: 0;
}
</style>
