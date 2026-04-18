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
    <span v-if="showNights" class="gantt-item__nights text-tabular">{{ nightsLabel }}</span>
    <span v-if="overdueDays > 0" class="gantt-item__overdue-label" :title="overdueLabelFull">{{ overdueLabelShort }}</span>
    <span v-if="showRevenue" class="gantt-item__revenue text-tabular">{{ formattedRevenue }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getHandoverType, getOverdueDays } from '../../utils/gantt'
import { startOfDay, diffDays } from '../../utils/date'
import { formatMoney } from '../../utils/currency'

const ITEM_GAP = 2

// FT-027: width thresholds for progressive disclosure — see feature REQ-03.
const WIDTH_REVENUE_MIN = 140
const WIDTH_NIGHTS_MIN = 180
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
  // FT-027: currency resolved once at Row level (REQ-06) — default ensures
  // tests/mocks without a store still render sensibly.
  currency: { type: String, default: 'RUB' },
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

// FT-027: nights count from pre-enriched booking (_start / _end are Date
// objects added by Row before passing). Guarded against invalid dates and
// 0-night edge cases (check_in === check_out).
const nights = computed(() => {
  const start = props.booking._start
  const end = props.booking._end
  if (!(start instanceof Date) || !(end instanceof Date)) return 0
  const n = diffDays(start, end)
  return Number.isFinite(n) && n > 0 ? n : 0
})

const nightsLabel = computed(() => t('calendar.gantt.nightsLabel', { n: nights.value }))

// FT-027 REQ-03: dimmed state = special mode active but booking doesn't match
// (handover non-matching, overdue non-matching). Revenue/nights would be
// unreadable at opacity 0.35, so suppress both per FM-06.
const isDimmed = computed(() => {
  if (props.specialMode === 'handover') return handoverType.value === null
  if (props.specialMode === 'overdue') return overdueDays.value === 0
  return false
})

// FT-027 REQ-03: revenue chip visibility.
// - Width ≥ 140px
// - Non-zero total_price_cents (blocking reservations skip)
// - NOT in overdue state where `+Nд` label claims the right slot (FM-05)
// - NOT dimmed (illegible)
const showRevenue = computed(() => {
  if (props.width < WIDTH_REVENUE_MIN) return false
  if (!props.booking.total_price_cents || props.booking.total_price_cents <= 0) return false
  if (overdueDays.value > 0) return false
  if (isDimmed.value) return false
  return true
})

// FT-027 REQ-03: nights indicator visibility. Same override set as revenue,
// plus requires width ≥ 180px (narrower bars need guest-name space).
const showNights = computed(() => {
  if (props.width < WIDTH_NIGHTS_MIN) return false
  if (nights.value <= 0) return false
  if (overdueDays.value > 0) return false
  if (isDimmed.value) return false
  return true
})

const formattedRevenue = computed(() => formatMoney(props.booking.total_price_cents, props.currency))

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

defineExpose({
  itemStyle, showLabel, label, itemClasses, handoverType, handoverMarker, handoverMarkerLabel,
  overdueDays, overdueLabelShort, onClick, onMouseEnter, onContextMenu,
  // FT-027
  nights, nightsLabel, isDimmed, showRevenue, showNights, formattedRevenue,
})
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
  /* FT-027 REQ-04: theme-aware outline replaces opaque box-shadow. */
  outline: 2px solid rgba(0, 0, 0, 0.3);
  outline-offset: 2px;
  z-index: 2;
}

:where(.dark) .gantt-item:hover {
  outline-color: rgba(255, 255, 255, 0.3);
}

.gantt-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  /* FT-027: switch from `width: 100%` to flex to share space with revenue + nights. */
  flex: 1 1 auto;
  min-width: 0;
}

/* FT-027: revenue chip — right-aligned via flex order + margin-left: auto trick.
   Compact, tabular numerics, muted. Does not intercept clicks. */
.gantt-item__revenue {
  margin-left: auto;
  padding-left: 6px;
  font-size: 11px;
  line-height: 1;
  opacity: 0.9;
  white-space: nowrap;
  flex-shrink: 0;
  pointer-events: none;
}

/* FT-027: nights indicator — between label and revenue, subtle. */
.gantt-item__nights {
  padding: 0 6px;
  font-size: 10px;
  line-height: 1;
  opacity: 0.75;
  white-space: nowrap;
  flex-shrink: 0;
  pointer-events: none;
}

.gantt-item--confirmed { background: var(--color-status-confirmed); }
.gantt-item--checked_in { background: var(--color-status-checked-in); }
.gantt-item--checked_out { background: var(--color-status-checked-out); }
.gantt-item--cancelled { background: var(--color-status-cancelled); }
.gantt-item--pending { background: var(--color-status-pending); }
.gantt-item--blocked { background: var(--color-status-blocked); }

/* FT-021 Handover Mode — border highlights + dimming */
.gantt-item--handover-checkin_today {
  border: 3px solid var(--color-finance-revenue);
}
.gantt-item--handover-checkin_tomorrow {
  border: 3px solid color-mix(in oklch, var(--color-finance-revenue) 50%, transparent);
}
.gantt-item--handover-checkout_today {
  border: 3px solid var(--color-finance-expense);
}
.gantt-item--handover-checkout_tomorrow {
  border: 3px solid var(--color-priority-high);
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
  border: 3px solid var(--color-finance-expense);
}

.gantt-item__overdue-label {
  margin-left: auto;
  padding: 0 4px;
  background: var(--color-finance-expense);
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
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklch, var(--color-finance-expense) 60%, transparent); }
  50% { box-shadow: 0 0 0 4px color-mix(in oklch, var(--color-finance-expense) 0%, transparent); }
}

@media (prefers-reduced-motion: reduce) {
  .gantt-item--overdue-pulse {
    animation: none;
  }
}
</style>
