<template>
  <Teleport to="body">
    <div
      v-if="visible && booking"
      class="gantt-tooltip"
      :style="{ left: x + 'px', top: y + 'px' }"
      role="tooltip"
    >
      <div class="gantt-tooltip__title">
        {{ booking.guest_name || $t('calendar.gantt.tooltip.blocking') }}
      </div>
      <div class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">{{ $t('calendar.gantt.tooltip.checkIn') }}:</span>
        <span>{{ booking.check_in }}</span>
      </div>
      <div class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">{{ $t('calendar.gantt.tooltip.checkOut') }}:</span>
        <span>{{ booking.check_out }}</span>
      </div>
      <div class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">{{ $t('calendar.gantt.tooltip.price') }}:</span>
        <span>{{ formattedPrice }}</span>
      </div>
      <div class="gantt-tooltip__row">
        <span class="gantt-tooltip__label">{{ $t('calendar.gantt.tooltip.status') }}:</span>
        <span class="gantt-tooltip__status" :class="`gantt-tooltip__status--${booking.status}`">
          {{ $t(`reservations.statuses.${statusKey}`) }}
        </span>
      </div>
      <div v-if="booking.property_name || booking.unit_name" class="gantt-tooltip__row gantt-tooltip__row--muted">
        {{ booking.property_name }}{{ booking.property_name && booking.unit_name ? ' — ' : '' }}{{ booking.unit_name }}
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { formatMoney } from '../../utils/currency'

const props = defineProps({
  booking: { type: Object, default: null },
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
})

const authStore = useAuthStore()

// Reservation status enum uses snake_case (`checked_in`); locale keys use
// camelCase (`checkedIn`).
const statusKey = computed(() => {
  const map = { confirmed: 'confirmed', checked_in: 'checkedIn', checked_out: 'checkedOut', cancelled: 'cancelled' }
  return map[props.booking?.status] || props.booking?.status
})

const formattedPrice = computed(() => {
  if (!props.booking) return ''
  const currency = authStore.organization?.currency || 'RUB'
  return formatMoney(props.booking.total_price_cents, currency)
})

defineExpose({ statusKey, formattedPrice })
</script>

<style scoped>
.gantt-tooltip {
  position: fixed;
  z-index: 9999;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 10px 12px;
  min-width: 220px;
  max-width: 320px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  font-size: 13px;
  pointer-events: none;
  transform: translate(8px, 8px);
}

.gantt-tooltip__title {
  font-weight: 600;
  margin-bottom: 6px;
  font-size: 14px;
}

.gantt-tooltip__row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}

.gantt-tooltip__row--muted {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-top: 6px;
  font-size: 12px;
  justify-content: flex-start;
}

.gantt-tooltip__label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.gantt-tooltip__status--confirmed { color: rgb(var(--v-theme-status-confirmed)); }
.gantt-tooltip__status--checked_in { color: rgb(var(--v-theme-status-checked-in)); }
.gantt-tooltip__status--checked_out { color: rgb(var(--v-theme-status-checked-out)); }
.gantt-tooltip__status--cancelled { color: rgb(var(--v-theme-status-cancelled)); }
</style>
