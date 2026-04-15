<template>
  <div class="gantt-timeline">
    <!-- Sticky-left header corner -->
    <div class="gantt-timeline__corner">
      {{ $t('calendar.unitColumn') }}
    </div>

    <!-- Sticky-left unit column -->
    <div class="gantt-timeline__sidebar">
      <div
        v-for="unit in units"
        :key="unit.id"
        class="gantt-timeline__unit-cell"
        :style="{ height: rowHeights[unit.id] || baseRowHeight + 'px' }"
        :title="`${unit.property_name} — ${unit.name}`"
      >
        <div class="gantt-timeline__unit-property">{{ unit.property_name }}</div>
        <div class="gantt-timeline__unit-name">{{ unit.name }}</div>
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
          />
        </div>

        <!-- Today marker -->
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
})

defineEmits(['show-booking', 'show-tooltip', 'hide-tooltip', 'context-menu'])

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

// Track row heights for sidebar sync (lanes can grow rows).
const rowHeights = ref({})

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
  pixelsPerMs, totalWidth, todayInRange, todayLeft, rowHeights, scrollToToday, scrollToDate, updateViewport,
})
</script>

<style scoped>
.gantt-timeline {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.gantt-timeline__corner {
  grid-column: 1;
  grid-row: 1;
  background: rgb(var(--v-theme-surface-light));
  padding: 4px 8px;
  font-weight: 600;
  font-size: 12px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  height: 50px;
  box-sizing: border-box;
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
</style>
