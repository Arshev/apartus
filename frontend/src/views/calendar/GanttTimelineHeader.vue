<template>
  <div class="gantt-header" :style="{ width: totalWidth + 'px' }">
    <!-- Top row: months -->
    <div class="gantt-header__row gantt-header__row--top">
      <div
        v-for="(cell, idx) in topCells"
        :key="`top-${idx}`"
        class="gantt-header__cell gantt-header__cell--top"
        :class="{ 'is-current-month': cell.isCurrentMonth }"
        :style="{ width: cell.days * dayCellWidth + 'px' }"
      >
        {{ cell.label }}
      </div>
    </div>

    <!-- Bottom row: days -->
    <div class="gantt-header__row gantt-header__row--bottom">
      <div
        v-for="(cell, idx) in bottomCells"
        :key="`bot-${idx}`"
        class="gantt-header__cell gantt-header__cell--bottom"
        :class="{ 'is-today': cell.isToday, 'is-weekend': cell.isWeekend }"
        :style="{ width: dayCellWidth + 'px' }"
      >
        <div class="gantt-header__day-of-week">{{ cell.dayOfWeek }}</div>
        <div class="gantt-header__day-num">{{ cell.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { generateTopLevelDates, generateBottomLevelDates } from '../../utils/gantt'

const MS_PER_DAY = 86_400_000

const props = defineProps({
  viewStart: { type: Date, required: true },
  viewEnd: { type: Date, required: true },
  pixelsPerMs: { type: Number, required: true },
  totalWidth: { type: Number, required: true },
})

const { locale } = useI18n()

const dayCellWidth = computed(() => props.pixelsPerMs * MS_PER_DAY)

const topCells = computed(() => generateTopLevelDates(props.viewStart, props.viewEnd, locale.value))
const bottomCells = computed(() => generateBottomLevelDates(props.viewStart, props.viewEnd, locale.value))

defineExpose({ topCells, bottomCells, dayCellWidth })
</script>

<style scoped>
.gantt-header {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--p-surface-50, #fafdfa);
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

:where(.dark) .gantt-header {
  background: var(--p-surface-900, #111a1b);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.gantt-header__row {
  display: flex;
}

.gantt-header__row--top {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

:where(.dark) .gantt-header__row--top {
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.gantt-header__cell {
  text-align: center;
  font-size: 12px;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  box-sizing: border-box;
}

:where(.dark) .gantt-header__cell {
  border-right-color: rgba(255, 255, 255, 0.06);
}

.gantt-header__cell--top {
  padding: 4px 6px;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gantt-header__cell--top.is-current-month {
  color: var(--color-primary-500);
}

.gantt-header__cell--bottom {
  padding: 2px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
}

.gantt-header__day-of-week {
  font-size: 10px;
  color: var(--p-surface-600, #5f6561);
  text-transform: uppercase;
}

.gantt-header__day-num {
  font-weight: 500;
}

.gantt-header__cell--bottom.is-weekend {
  background: rgba(0, 0, 0, 0.04);
}

:where(.dark) .gantt-header__cell--bottom.is-weekend {
  background: rgba(255, 255, 255, 0.04);
}

.gantt-header__cell--bottom.is-today {
  background: color-mix(in oklch, var(--color-primary-500) 12%, transparent);
  font-weight: 700;
}

.gantt-header__cell--bottom.is-today .gantt-header__day-num {
  color: var(--color-primary-500);
}
</style>
