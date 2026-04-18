<template>
  <div class="reservation-date-picker">
    <label :for="fieldId" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
      {{ $t('reservations.form.dates') }}
    </label>
    <DatePicker
      :id="fieldId"
      :model-value="pickerValue"
      selection-mode="range"
      :placeholder="$t('reservations.form.datesPlaceholder')"
      :date-format="'dd M'"
      show-icon
      icon="pi pi-calendar"
      class="w-full"
      @update:model-value="onRangeChange"
    />
    <p v-if="displayText" class="mt-1 text-xs text-surface-600 dark:text-surface-400">
      {{ displayText }}
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import DatePicker from 'primevue/datepicker'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ checkIn: '', checkOut: '' }),
  },
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const fieldId = `reservation-date-range-${Math.random().toString(36).slice(2, 8)}`
const menuOpen = ref(false)

// PrimeVue DatePicker range mode emits [start, end] (either may be null mid-pick).
const pickerValue = computed(() => {
  const ci = props.modelValue?.checkIn
  const co = props.modelValue?.checkOut
  if (!ci || !co) return []
  return [new Date(ci + 'T00:00:00Z'), new Date(co + 'T00:00:00Z')]
})

const nightsCount = computed(() => {
  const { checkIn, checkOut } = props.modelValue || {}
  if (!checkIn || !checkOut) return 0
  const a = new Date(checkIn + 'T00:00:00Z').getTime()
  const b = new Date(checkOut + 'T00:00:00Z').getTime()
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const displayText = computed(() => {
  const { checkIn, checkOut } = props.modelValue || {}
  if (!checkIn || !checkOut) return ''
  const nights = nightsCount.value
  return t('reservations.form.nightsCount', { count: nights }, nights)
})

function toIso(d) {
  return new Date(d).toISOString().slice(0, 10)
}

function onRangeChange(dates) {
  // PrimeVue range: [Date, Date|null] during pick, [Date, Date] when done.
  if (!Array.isArray(dates) || dates.length < 2) return
  const [start, end] = dates
  if (!start || !end) return // mid-pick, wait for second date
  emit('update:modelValue', {
    checkIn: toIso(start),
    checkOut: toIso(end),
  })
  menuOpen.value = false
}

defineExpose({ menuOpen, displayText, nightsCount, onRangeChange, pickerValue })
</script>

<style scoped>
/* Component inherits PrimeVue + Tailwind styles. */
</style>
