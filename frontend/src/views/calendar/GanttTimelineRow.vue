<template>
  <div class="gantt-row" :style="rowStyle">
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
import { computed } from 'vue'
import GanttTimelineItem from './GanttTimelineItem.vue'
import { dateToPixel, bookingWidth, assignLanes } from '../../utils/gantt'
import { parseIsoDate } from '../../utils/date'

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

defineEmits(['show-booking', 'show-tooltip', 'hide-tooltip', 'context-menu'])

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

function itemLeft(item) {
  return dateToPixel(item._start, props.viewStart, props.pixelsPerMs)
}

function itemWidth(item) {
  return bookingWidth(item._start, item._end, props.pixelsPerMs)
}

function laneOf(item) {
  return laneData.value.lanes[item.id] || 0
}

defineExpose({ enrichedBookings, laneData, computedRowHeight, rowStyle, itemLeft, itemWidth, laneOf })
</script>

<style scoped>
.gantt-row {
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-sizing: border-box;
}
</style>
