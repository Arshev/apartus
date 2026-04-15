<template>
  <div
    class="gantt-item"
    :class="itemClasses"
    :style="itemStyle"
    @click.stop="onClick"
    @contextmenu.prevent.stop="onContextMenu"
    @mouseenter="onMouseEnter"
    @mouseleave="$emit('hide-tooltip')"
  >
    <span v-if="handoverMarker" class="gantt-item__marker" :title="handoverMarkerLabel">{{ handoverMarker }}</span>
    <span v-if="showLabel" class="gantt-item__label">{{ label }}</span>
    <span v-if="overdueDays > 0" class="gantt-item__overdue-label" :title="overdueLabelFull">{{ overdueLabelShort }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getHandoverType, getOverdueDays } from '../../utils/gantt'
import { startOfDay } from '../../utils/date'

const ITEM_GAP = 2
const HANDOVER_MARKERS = {
  checkin_today: '\u2197', // ↗
  checkin_tomorrow: '\u2197', // ↗ (same icon, lighter border differentiates)
  checkout_today: '\u2199', // ↙
  checkout_tomorrow: '\u2199',
}

const { t } = useI18n()

const props = defineProps({
  booking: { type: Object, required: true },
  left: { type: Number, required: true },
  width: { type: Number, required: true },
  lane: { type: Number, default: 0 },
  itemHeight: { type: Number, default: 28 },
  specialMode: { type: String, default: '' },
})

const emit = defineEmits(['show-booking', 'show-tooltip', 'hide-tooltip', 'context-menu'])

const itemStyle = computed(() => ({
  left: props.left + 'px',
  width: Math.max(props.width, 4) + 'px',
  height: props.itemHeight + 'px',
  top: 3 + props.lane * (props.itemHeight + ITEM_GAP) + 'px',
}))

const showLabel = computed(() => props.width >= 30)

const label = computed(() => {
  if (props.width < 80) return `#${props.booking.id}`
  return props.booking.guest_name || `#${props.booking.id}`
})

// Handover mode — classify booking against today's ±1d bracket.
const handoverType = computed(() => {
  if (props.specialMode !== 'handover') return null
  return getHandoverType(props.booking, startOfDay(new Date()))
})

const handoverMarker = computed(() => {
  // Only today gets a marker — tomorrow indicated by border color only.
  if (handoverType.value === 'checkin_today') return HANDOVER_MARKERS.checkin_today
  if (handoverType.value === 'checkout_today') return HANDOVER_MARKERS.checkout_today
  return null
})

const handoverMarkerLabel = computed(() => {
  if (!handoverType.value) return ''
  return t(`calendar.gantt.handoverMarkers.${camelCase(handoverType.value)}`)
})

function camelCase(snake) {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

// Overdue mode — count overdue days against today's local midnight.
const overdueDays = computed(() => {
  if (props.specialMode !== 'overdue') return 0
  return getOverdueDays(props.booking, startOfDay(new Date()))
})

const overdueLabelShort = computed(() => {
  if (overdueDays.value <= 0) return ''
  return t('calendar.gantt.overdueLabel', { n: overdueDays.value })
})

const overdueLabelFull = computed(() => overdueLabelShort.value)

const itemClasses = computed(() => {
  const classes = [`gantt-item--${props.booking.status}`]
  if (props.specialMode === 'handover') {
    if (handoverType.value) {
      classes.push(`gantt-item--handover-${handoverType.value}`)
    } else {
      classes.push('gantt-item--dimmed')
    }
  } else if (props.specialMode === 'overdue') {
    if (overdueDays.value > 0) {
      classes.push('gantt-item--overdue', 'gantt-item--overdue-pulse')
    } else {
      classes.push('gantt-item--dimmed')
    }
  }
  return classes
})

function onClick() {
  emit('show-booking', props.booking.id)
}

function onMouseEnter(event) {
  emit('show-tooltip', { booking: props.booking, x: event.clientX, y: event.clientY })
}

function onContextMenu(event) {
  emit('context-menu', { booking: props.booking, x: event.clientX, y: event.clientY })
}

defineExpose({ itemStyle, showLabel, label, itemClasses, handoverType, handoverMarker, handoverMarkerLabel, overdueDays, overdueLabelShort, onClick, onMouseEnter, onContextMenu })
</script>

<style scoped>
.gantt-item {
  position: absolute;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 0 6px;
  overflow: hidden;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  user-select: none;
  transition: opacity 0.15s, box-shadow 0.15s;
  z-index: 1;
}

.gantt-item:hover {
  opacity: 0.9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 2;
}

.gantt-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  width: 100%;
}

.gantt-item--confirmed { background: rgb(var(--v-theme-status-confirmed)); }
.gantt-item--checked_in { background: rgb(var(--v-theme-status-checked-in)); }
.gantt-item--checked_out { background: rgb(var(--v-theme-status-checked-out)); }
.gantt-item--cancelled { background: rgb(var(--v-theme-status-cancelled)); }
.gantt-item--pending { background: rgb(var(--v-theme-status-pending)); }
.gantt-item--blocked { background: rgb(var(--v-theme-status-blocked)); }

/* FT-021 Handover Mode — border highlights + dimming */
.gantt-item--handover-checkin_today {
  border: 3px solid rgb(var(--v-theme-success));
}
.gantt-item--handover-checkin_tomorrow {
  border: 3px solid rgba(var(--v-theme-success), 0.5);
}
.gantt-item--handover-checkout_today {
  border: 3px solid rgb(var(--v-theme-error));
}
.gantt-item--handover-checkout_tomorrow {
  border: 3px solid rgb(var(--v-theme-warning));
}
.gantt-item--dimmed {
  opacity: 0.35;
}
.gantt-item--dimmed:hover {
  opacity: 0.5;
}

.gantt-item__marker {
  font-size: 14px;
  font-weight: 700;
  margin-right: 3px;
  pointer-events: none;
  flex-shrink: 0;
}

/* FT-022 Overdue Mode */
.gantt-item--overdue {
  border: 3px solid rgb(var(--v-theme-error));
}

.gantt-item__overdue-label {
  margin-left: auto;
  padding: 0 4px;
  background: rgb(var(--v-theme-error));
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 3px;
  pointer-events: none;
  flex-shrink: 0;
}

.gantt-item--overdue-pulse {
  animation: overdue-pulse 1.5s ease-in-out infinite;
}

@keyframes overdue-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--v-theme-error), 0.6); }
  50% { box-shadow: 0 0 0 4px rgba(var(--v-theme-error), 0); }
}

@media (prefers-reduced-motion: reduce) {
  .gantt-item--overdue-pulse {
    animation: none;
  }
}
</style>
