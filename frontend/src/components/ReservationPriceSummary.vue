<template>
  <aside class="price-summary" aria-live="polite">
    <h3 class="price-summary__title">
      {{ $t('reservations.form.priceSummary.title') }}
    </h3>

    <div v-if="!unitId || !checkIn || !checkOut" class="price-summary__empty">
      {{ $t('reservations.form.priceSummary.emptyState') }}
    </div>

    <div v-else-if="breakdown.length === 0" class="price-summary__empty">
      {{ $t('reservations.form.priceSummary.errorState') }}
    </div>

    <template v-else>
      <div class="price-summary__dates">
        {{ dateRangeText }}
      </div>

      <ul class="price-summary__rows">
        <li v-for="(row, i) in breakdown" :key="i" class="price-summary__row">
          <span>
            {{ row.nights }} × {{ formatMoney(row.priceCents, currency) }}
            <span v-if="row.seasonal" class="price-summary__seasonal-tag">
              ({{ $t('reservations.form.priceSummary.seasonalLabel') }})
            </span>
          </span>
          <span>{{ formatMoney(row.nights * row.priceCents, currency) }}</span>
        </li>
      </ul>

      <div class="price-summary__divider" />

      <div class="price-summary__total">
        <span>{{ $t('reservations.form.priceSummary.total') }}</span>
        <strong>{{ formatMoney(effectiveTotal, currency) }}</strong>
      </div>

      <div v-if="manualOverride && diff !== 0" class="price-summary__manual">
        <span class="price-summary__manual-chip">
          {{
            $t('reservations.form.priceSummary.manualPrice', {
              sign: diff < 0 ? '−' : '+',
              diff: formatMoney(Math.abs(diff), currency),
            })
          }}
        </span>
        <button
          data-testid="recalc-btn"
          type="button"
          class="price-summary__recalc-btn"
          @click="$emit('recalc')"
        >
          {{ $t('reservations.form.priceSummary.recalc') }}
        </button>
      </div>
    </template>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMoney } from '../utils/currency'

const props = defineProps({
  checkIn: { type: String, default: '' },
  checkOut: { type: String, default: '' },
  unitId: { type: [Number, String, null], default: null },
  basePriceCents: { type: Number, default: 0 },
  seasonalPrices: { type: Array, default: () => [] },
  currency: { type: String, default: 'RUB' },
  autoTotalCents: { type: Number, default: 0 },
  manualTotalCents: { type: Number, default: 0 },
  manualOverride: { type: Boolean, default: false },
})
defineEmits(['recalc'])

const { t } = useI18n()

const breakdown = computed(() => {
  if (!props.checkIn || !props.checkOut) return []
  const start = new Date(props.checkIn + 'T00:00:00Z')
  const end = new Date(props.checkOut + 'T00:00:00Z')
  if (end <= start) return []

  const buckets = new Map()
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ds = d.toISOString().slice(0, 10)
    const sp = props.seasonalPrices.find((s) => ds >= s.start_date && ds < s.end_date)
    const priceCents = sp ? sp.price_cents : props.basePriceCents
    const key = sp ? `s:${sp.id}:${priceCents}` : `b:${priceCents}`
    const prev = buckets.get(key)
    buckets.set(key, {
      priceCents,
      seasonal: !!sp,
      nights: (prev?.nights || 0) + 1,
    })
  }
  return [...buckets.values()]
})

const nightsCount = computed(() => breakdown.value.reduce((n, r) => n + r.nights, 0))

const dateRangeText = computed(() => {
  const fmt = (iso) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  const nights = nightsCount.value
  return `${fmt(props.checkIn)} – ${fmt(props.checkOut)} · ${t(
    'reservations.form.nightsCount',
    { count: nights },
    nights,
  )}`
})

const effectiveTotal = computed(() =>
  props.manualOverride ? props.manualTotalCents : props.autoTotalCents,
)

const diff = computed(() => props.manualTotalCents - props.autoTotalCents)

defineExpose({ breakdown, nightsCount, diff, effectiveTotal })
</script>

<style scoped>
.price-summary {
  position: sticky;
  top: 80px;
  padding: 20px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:where(.dark) .price-summary {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.02);
}

.price-summary__title {
  font-family: var(--font-display, inherit);
  font-size: 0.8125rem;
  font-weight: 500;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-surface-600, #5f6561);
}

.price-summary__empty {
  color: var(--p-surface-600, #5f6561);
  font-size: 0.875rem;
  padding: 8px 0;
}

.price-summary__dates {
  font-size: 0.9rem;
  color: var(--p-surface-700, #4a5048);
}

:where(.dark) .price-summary__dates {
  color: var(--p-surface-200, #b9c0bb);
}

.price-summary__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.price-summary__row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  gap: 12px;
  font-variant-numeric: tabular-nums;
}

.price-summary__seasonal-tag {
  color: var(--p-surface-500, #7a807c);
  font-size: 0.75rem;
  margin-left: 4px;
}

.price-summary__divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.12);
  margin: 4px 0;
}

:where(.dark) .price-summary__divider {
  background: rgba(255, 255, 255, 0.12);
}

.price-summary__total {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.price-summary__total strong {
  font-family: var(--font-display, inherit);
  font-weight: 500;
  font-size: 1.375rem;
  letter-spacing: -0.01em;
}

.price-summary__manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
  align-items: flex-start;
}

.price-summary__manual-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 500;
  color: #92400e;
  background: color-mix(in oklch, var(--color-priority-high) 15%, transparent);
  border: 1px solid color-mix(in oklch, var(--color-priority-high) 30%, transparent);
  border-radius: 9999px;
}

:where(.dark) .price-summary__manual-chip {
  color: #fde68a;
}

.price-summary__recalc-btn {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary-500);
  background: transparent;
  border: 0;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.price-summary__recalc-btn:hover {
  background: color-mix(in oklch, var(--color-primary-500) 8%, transparent);
}

@media (max-width: 959px) {
  .price-summary {
    position: static;
  }
}
</style>
