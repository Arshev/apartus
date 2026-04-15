<template>
  <div
    class="gantt-item"
    :class="`gantt-item--${booking.status}`"
    :style="itemStyle"
    @click.stop="onClick"
    @contextmenu.prevent.stop="onContextMenu"
    @mouseenter="onMouseEnter"
    @mouseleave="$emit('hide-tooltip')"
  >
    <span v-if="showLabel" class="gantt-item__label">{{ label }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const ITEM_GAP = 2

const props = defineProps({
  booking: { type: Object, required: true },
  left: { type: Number, required: true },
  width: { type: Number, required: true },
  lane: { type: Number, default: 0 },
  itemHeight: { type: Number, default: 28 },
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

function onClick() {
  emit('show-booking', props.booking.id)
}

function onMouseEnter(event) {
  emit('show-tooltip', { booking: props.booking, x: event.clientX, y: event.clientY })
}

function onContextMenu(event) {
  emit('context-menu', { booking: props.booking, x: event.clientX, y: event.clientY })
}

defineExpose({ itemStyle, showLabel, label, onClick, onMouseEnter, onContextMenu })
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
</style>
