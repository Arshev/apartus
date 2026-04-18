<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false">
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="menuProps"
        :model-value="displayText"
        :label="$t('reservations.form.dates')"
        readonly
        prepend-inner-icon="mdi-calendar-range"
        :placeholder="$t('reservations.form.datesPlaceholder')"
      />
    </template>
    <v-date-picker
      :model-value="pickerValue"
      multiple="range"
      @update:model-value="onRangeChange"
    />
  </v-menu>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ checkIn: '', checkOut: '' }),
  },
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const menuOpen = ref(false)

const pickerValue = computed(() => {
  const ci = props.modelValue?.checkIn
  const co = props.modelValue?.checkOut
  if (!ci || !co) return []
  const start = new Date(ci + 'T00:00:00Z')
  const end = new Date(co + 'T00:00:00Z')
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d))
  }
  return dates
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
  if (!checkIn || !checkOut) return t('reservations.form.datesPlaceholder')
  const fmt = (iso) => {
    const d = new Date(iso + 'T00:00:00Z')
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  }
  const nights = nightsCount.value
  return `${fmt(checkIn)} – ${fmt(checkOut)} · ${t('reservations.form.nightsCount', { count: nights }, nights)}`
})

function toIso(d) {
  return new Date(d).toISOString().slice(0, 10)
}

function onRangeChange(dates) {
  if (!Array.isArray(dates) || dates.length < 2) return
  const sorted = [...dates].sort((a, b) => new Date(a) - new Date(b))
  emit('update:modelValue', {
    checkIn: toIso(sorted[0]),
    checkOut: toIso(sorted[sorted.length - 1]),
  })
  menuOpen.value = false
}

defineExpose({ menuOpen, displayText, nightsCount, onRangeChange, pickerValue })
</script>

<style scoped>
/* Component inherits Vuetify styles; no custom CSS required. */
</style>
