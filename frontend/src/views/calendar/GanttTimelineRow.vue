<template>
  <div class="gantt-row" :style="rowStyle">
    <!-- FT-024 Heatmap layer — under items, pointer-events: none. -->
    <div
      v-for="(cell, idx) in heatCells"
      :key="`heat-${idx}`"
      class="gantt-row__heat-cell"
      :class="`gantt-row__heat-cell--${cell.status}`"
      :style="heatCellStyle(cell)"
    />

    <!-- FT-023 Idle Gaps layer — under items, pointer-events: none (see REQ-03). -->
    <div
      v-for="(gap, idx) in idleGaps"
      :key="`gap-${idx}`"
      class="gantt-row__idle-gap"
      :style="gapStyle(gap)"
    >
      <span v-if="gapPixelWidth(gap) > 40" class="gantt-row__idle-gap-label">{{ t('calendar.gantt.idleLabel', { n: gap.days }) }}</span>
    </div>

    <GanttTimelineItem
      v-for="item in enrichedBookings"
      :key="item.id"
      :booking="item"
      :left="itemLeft(item)"
      :width="itemWidth(item)"
      :lane="laneOf(item)"
      :item-height="itemHeight"
      :special-mode="specialMode"
      @show-booking="$emit('show-booking', $event)"
      @show-tooltip="$emit('show-tooltip', $event)"
      @hide-tooltip="$emit('hide-tooltip')"
      @context-menu="$emit('context-menu', $event)"
    />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import GanttTimelineItem from './GanttTimelineItem.vue'
import { dateToPixel, bookingWidth, assignLanes, findIdleGaps, getDayCellStatus } from '../../utils/gantt'
import { parseIsoDate, startOfDay, addDays } from '../../utils/date'

const MS_PER_DAY = 86_400_000

const { t } = useI18n()

const ITEM_GAP = 2

const props = defineProps({
  unit: { type: Object, required: true },
  bookings: { type: Array, default: () => [] },
  viewStart: { type: Date, required: true },
  viewEnd: { type: Date, required: true },
  pixelsPerMs: { type: Number, required: true },
  totalWidth: { type: Number, required: true },
  baseRowHeight: { type: Number, default: 36 },
  itemHeight: { type: Number, default: 28 },
  specialMode: { type: String, default: '' },
})

const emit = defineEmits(['show-booking', 'show-tooltip', 'hide-tooltip', 'context-menu', 'row-height-changed'])

// Enrich with parsed Date objects; filter out invalid + cancelled + orphan.
const enrichedBookings = computed(() => {
  return props.bookings
    .filter((r) => {
      if (r.status === 'cancelled') return false
      if (r.unit_id == null) {
        // eslint-disable-next-line no-console
        console.warn(`[gantt] reservation ${r.id} has no unit_id, skipped`)
        return false
      }
      if (r.unit_id !== props.unit.id) return false
      return true
    })
    .map((r) => ({ ...r, _start: parseIsoDate(r.check_in), _end: parseIsoDate(r.check_out) }))
    .filter((r) => {
      if (r._end.valueOf() <= r._start.valueOf()) {
        // eslint-disable-next-line no-console
        console.warn(`[gantt] reservation ${r.id} has invalid dates (check_in >= check_out), skipped`)
        return false
      }
      return true
    })
})

const laneData = computed(() => assignLanes(enrichedBookings.value))

const computedRowHeight = computed(() => {
  const lanes = Math.max(1, laneData.value.maxLane)
  return Math.max(props.baseRowHeight, lanes * (props.itemHeight + ITEM_GAP) + 6)
})

const rowStyle = computed(() => ({
  height: computedRowHeight.value + 'px',
  width: props.totalWidth + 'px',
  position: 'relative',
}))

// Keep sidebar cell in sync with the computed row height (lanes can grow rows).
watch(computedRowHeight, (height) => {
  emit('row-height-changed', { unitId: props.unit.id, height })
}, { immediate: true })

function itemLeft(item) {
  return dateToPixel(item._start, props.viewStart, props.pixelsPerMs)
}

function itemWidth(item) {
  return bookingWidth(item._start, item._end, props.pixelsPerMs)
}

function laneOf(item) {
  return laneData.value.lanes[item.id] || 0
}

// FT-023: idle gaps — only when specialMode === 'idle'.
const idleGaps = computed(() => {
  if (props.specialMode !== 'idle') return []
  return findIdleGaps(enrichedBookings.value, props.viewStart, props.viewEnd)
})

function gapStyle(gap) {
  const left = dateToPixel(gap.start, props.viewStart, props.pixelsPerMs)
  const width = dateToPixel(gap.end, props.viewStart, props.pixelsPerMs) - left
  return {
    left: left + 'px',
    width: Math.max(width, 2) + 'px',
  }
}

function gapPixelWidth(gap) {
  return dateToPixel(gap.end, props.viewStart, props.pixelsPerMs)
    - dateToPixel(gap.start, props.viewStart, props.pixelsPerMs)
}

// FT-024: heatmap cells — array of {date, status} per day in viewport.
const heatCells = computed(() => {
  if (props.specialMode !== 'heatmap') return []
  const cells = []
  const viewStartDay = startOfDay(props.viewStart)
  const viewEndDay = startOfDay(props.viewEnd)
  let cursor = viewStartDay
  while (cursor.valueOf() <= viewEndDay.valueOf()) {
    cells.push({
      date: cursor,
      status: getDayCellStatus(cursor, enrichedBookings.value),
    })
    cursor = addDays(cursor, 1)
  }
  return cells
})

function heatCellStyle(cell) {
  const left = dateToPixel(cell.date, props.viewStart, props.pixelsPerMs)
  const width = MS_PER_DAY * props.pixelsPerMs
  return {
    left: left + 'px',
    width: width + 'px',
  }
}

defineExpose({ enrichedBookings, laneData, computedRowHeight, rowStyle, itemLeft, itemWidth, laneOf, idleGaps, gapStyle, gapPixelWidth, heatCells, heatCellStyle })
</script>

<style scoped>
.gantt-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-sizing: border-box;
}

/* FT-023 Idle Gaps */
.gantt-row__idle-gap {
  position: absolute;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    -45deg,
    rgba(var(--v-theme-error), 0.08),
    rgba(var(--v-theme-error), 0.08) 4px,
    rgba(var(--v-theme-error), 0.18) 4px,
    rgba(var(--v-theme-error), 0.18) 8px
  );
  border-left: 2px dashed rgba(var(--v-theme-error), 0.5);
  border-right: 2px dashed rgba(var(--v-theme-error), 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
  pointer-events: none;
}

.gantt-row__idle-gap-label {
  background: rgba(var(--v-theme-error), 0.85);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

/* FT-024 Heatmap */
.gantt-row__heat-cell {
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.gantt-row__heat-cell--busy {
  background: rgba(var(--v-theme-error), 0.20);
}

.gantt-row__heat-cell--free {
  background: rgba(var(--v-theme-success), 0.15);
}
</style>
