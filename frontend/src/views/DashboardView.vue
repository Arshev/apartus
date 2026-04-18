<template>
  <div class="dashboard max-w-[1280px] mx-auto px-6 py-6">
    <!-- Greeting -->
    <h1 class="dashboard__greeting text-xl font-bold mb-1">
      {{ $t('dashboard.greeting', { name: authStore.user?.full_name }) }}
    </h1>
    <p class="dashboard__org text-sm text-surface-600 dark:text-surface-400 mb-8">
      {{ authStore.organization?.name }}
    </p>

    <div v-if="loading" class="h-0.5 bg-primary-500 animate-pulse mb-4" />
    <div
      v-if="error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span class="flex-1">{{ error }}</span>
      <button type="button" class="text-red-500 hover:text-red-700" :aria-label="$t('common.close')" @click="error = null">
        <i class="pi pi-times" />
      </button>
    </div>

    <template v-if="data">
      <!-- FT-031: Hero — revenue dominates, supporting metrics inline. No cards. -->
      <section class="dashboard__hero mb-10" data-testid="dashboard-hero">
        <div class="dashboard__hero-label text-table-header">
          {{ $t('dashboard.kpi.revenue') }}
        </div>
        <div class="dashboard__hero-value text-tabular" data-testid="dashboard-hero-value">
          {{ formatPrice(data.revenue_this_month) }}
        </div>

        <div class="dashboard__supporting">
          <div class="dashboard__stat">
            <div class="dashboard__stat-value text-tabular" data-testid="dashboard-stat-units">{{ data.total_units }}</div>
            <div class="dashboard__stat-label">{{ $t('dashboard.kpi.units') }}</div>
          </div>
          <div class="dashboard__stat">
            <div class="dashboard__stat-value text-tabular" data-testid="dashboard-stat-occupancy">
              {{ (data.occupancy_rate * 100).toFixed(0) }}%
            </div>
            <div class="dashboard__stat-label">{{ $t('dashboard.kpi.occupancy') }}</div>
          </div>
          <div class="dashboard__stat">
            <div class="dashboard__stat-value text-tabular" data-testid="dashboard-stat-reservations">{{ totalReservations }}</div>
            <div class="dashboard__stat-label">{{ $t('dashboard.kpi.reservations') }}</div>
          </div>
        </div>

        <div class="dashboard__occupancy-track">
          <div
            class="dashboard__occupancy-fill"
            :style="{ width: (data.occupancy_rate * 100) + '%' }"
            :aria-label="$t('dashboard.kpi.occupancy')"
            role="progressbar"
            :aria-valuenow="Math.round(data.occupancy_rate * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
      </section>

      <!-- FT-031: Status breakdown — single horizontal stacked bar + legend. -->
      <section class="dashboard__status mb-10" data-testid="dashboard-status">
        <div class="dashboard__status-header">
          <div class="dashboard__status-total text-tabular" data-testid="dashboard-status-total">{{ totalReservations }}</div>
          <div class="text-table-header">{{ $t('dashboard.kpi.reservations') }}</div>
        </div>

        <div class="dashboard__status-bar" role="img" :aria-label="statusBarAriaLabel">
          <template v-if="totalReservations > 0">
            <span
              v-for="seg in statusSegments"
              :key="seg.key"
              class="dashboard__status-bar-segment"
              :class="`dashboard__status-bar-segment--${seg.key}`"
              :style="{ flexBasis: seg.flexBasis }"
              :title="`${$t('dashboard.statuses.' + seg.i18nKey)}: ${seg.count}`"
            />
          </template>
          <span v-else class="dashboard__status-bar-empty text-surface-600 dark:text-surface-400">—</span>
        </div>

        <ul class="dashboard__status-legend">
          <li
            v-for="seg in statusSegments"
            :key="seg.key"
            class="dashboard__status-legend-item"
            :data-testid="`dashboard-status-legend-${seg.key}`"
          >
            <span class="dashboard__status-dot" :class="`dashboard__status-dot--${seg.key}`" />
            <span class="dashboard__status-legend-label">{{ $t('dashboard.statuses.' + seg.i18nKey) }}</span>
            <span class="dashboard__status-legend-count text-tabular">{{ seg.count }}</span>
          </li>
        </ul>
      </section>

      <!-- FT-031: Upcoming — clean lists. -->
      <section class="dashboard__upcoming" data-testid="dashboard-upcoming">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 class="dashboard__upcoming-heading">{{ $t('dashboard.checkIns') }}</h2>
            <ul v-if="data.upcoming_check_ins.length" class="dashboard__upcoming-list">
              <li
                v-for="r in data.upcoming_check_ins"
                :key="r.id"
                class="dashboard__upcoming-item"
              >
                <span class="dashboard__upcoming-name">{{ r.guest_name || $t('common.blocking') }}</span>
                <span class="dashboard__upcoming-unit text-surface-600 dark:text-surface-400">{{ r.unit_name }}</span>
                <span class="dashboard__upcoming-date text-tabular">{{ r.check_in }}</span>
              </li>
            </ul>
            <div v-else class="dashboard__upcoming-empty text-surface-600 dark:text-surface-400">{{ $t('dashboard.noCheckIns') }}</div>
          </div>
          <div>
            <h2 class="dashboard__upcoming-heading">{{ $t('dashboard.checkOuts') }}</h2>
            <ul v-if="data.upcoming_check_outs.length" class="dashboard__upcoming-list">
              <li
                v-for="r in data.upcoming_check_outs"
                :key="r.id"
                class="dashboard__upcoming-item"
              >
                <span class="dashboard__upcoming-name">{{ r.guest_name || $t('common.blocking') }}</span>
                <span class="dashboard__upcoming-unit text-surface-600 dark:text-surface-400">{{ r.unit_name }}</span>
                <span class="dashboard__upcoming-date text-tabular">{{ r.check_out }}</span>
              </li>
            </ul>
            <div v-else class="dashboard__upcoming-empty text-surface-600 dark:text-surface-400">{{ $t('dashboard.noCheckOuts') }}</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import * as dashboardApi from '../api/dashboard'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()

const authStore = useAuthStore()
const data = ref(null)
const loading = ref(false)
const error = ref(null)

const currency = computed(() => authStore.organization?.currency || 'RUB')
function formatPrice(cents) {
  return formatMoney(cents, currency.value)
}

const totalReservations = computed(() => {
  if (!data.value) return 0
  const s = data.value.reservations_by_status
  return (s.confirmed || 0) + (s.checked_in || 0) + (s.checked_out || 0) + (s.cancelled || 0)
})

const statusSegments = computed(() => {
  const s = data.value?.reservations_by_status || {}
  const total = totalReservations.value
  const raw = [
    { key: 'confirmed', i18nKey: 'confirmed', count: s.confirmed || 0 },
    { key: 'checked-in', i18nKey: 'checkedIn', count: s.checked_in || 0 },
    { key: 'checked-out', i18nKey: 'checkedOut', count: s.checked_out || 0 },
    { key: 'cancelled', i18nKey: 'cancelled', count: s.cancelled || 0 },
  ]
  return raw.map((seg) => ({
    ...seg,
    flexBasis: total > 0 ? `${(seg.count / total) * 100}%` : '0%',
  }))
})

const statusBarAriaLabel = computed(() => {
  return statusSegments.value.map((s) => `${t('dashboard.statuses.' + s.i18nKey)}: ${s.count}`).join(', ')
})

async function loadDashboard() {
  loading.value = true
  error.value = null
  try {
    data.value = await dashboardApi.get()
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    error.value = t('dashboard.messages.loadError')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadDashboard())

defineExpose({ data, loading, error, formatPrice, loadDashboard, totalReservations, statusSegments, statusBarAriaLabel })
</script>

<style scoped>
/* FT-031: Editorial hierarchy — typography does the work.
   FT-036 P4: Vuetify theme tokens swapped для raw color functions +
   Tailwind color tokens (@theme) where semantic. Structure/classes
   preserved — FT-031 test ids still match. */

.dashboard__greeting {
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.dashboard__hero-label {
  margin-bottom: 8px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--p-surface-600));
}

.dashboard__hero-value {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 3.5rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
  color: rgb(var(--p-surface-900));
  overflow-wrap: anywhere;
  margin-bottom: 24px;
}

:where(.dark) .dashboard__hero-value {
  color: rgb(var(--p-surface-0));
}

.dashboard__supporting {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  margin-bottom: 16px;
}

.dashboard__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dashboard__stat-value {
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  color: rgb(var(--p-surface-900));
}

:where(.dark) .dashboard__stat-value {
  color: rgb(var(--p-surface-0));
}

.dashboard__stat-label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--p-surface-600));
}

.dashboard__occupancy-track {
  height: 2px;
  width: 100%;
  max-width: 480px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
  overflow: hidden;
}

:where(.dark) .dashboard__occupancy-track {
  background: rgba(255, 255, 255, 0.12);
}

.dashboard__occupancy-fill {
  height: 100%;
  background: var(--color-primary-500);
  transition: width 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard__occupancy-fill { transition: none; }
}

/* ── Status breakdown ─────────────────────────────────────────────── */
.dashboard__status-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.dashboard__status-total {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
  color: rgb(var(--p-surface-900));
}

:where(.dark) .dashboard__status-total {
  color: rgb(var(--p-surface-0));
}

.dashboard__status-bar {
  display: flex;
  height: 8px;
  width: 100%;
  max-width: 720px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

:where(.dark) .dashboard__status-bar {
  background: rgba(255, 255, 255, 0.08);
}

.dashboard__status-bar-segment {
  height: 100%;
  transition: flex-basis 0.3s ease-out;
}

.dashboard__status-bar-segment--confirmed   { background: var(--color-status-confirmed); }
.dashboard__status-bar-segment--checked-in  { background: var(--color-status-checked-in); }
.dashboard__status-bar-segment--checked-out { background: var(--color-status-checked-out); }
.dashboard__status-bar-segment--cancelled   { background: var(--color-status-cancelled); }

.dashboard__status-bar-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-size: 12px;
}

.dashboard__status-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 24px 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.dashboard__status-legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.dashboard__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dashboard__status-dot--confirmed   { background: var(--color-status-confirmed); }
.dashboard__status-dot--checked-in  { background: var(--color-status-checked-in); }
.dashboard__status-dot--checked-out { background: var(--color-status-checked-out); }
.dashboard__status-dot--cancelled   { background: var(--color-status-cancelled); }

.dashboard__status-legend-label {
  color: rgb(var(--p-surface-600));
}

.dashboard__status-legend-count {
  font-weight: 600;
  color: rgb(var(--p-surface-900));
}

:where(.dark) .dashboard__status-legend-count {
  color: rgb(var(--p-surface-0));
}

/* ── Upcoming ─────────────────────────────────────────────────────── */
.dashboard__upcoming-heading {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  color: rgb(var(--p-surface-600));
  margin-bottom: 12px;
}

.dashboard__upcoming-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dashboard__upcoming-item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 14px;
}

:where(.dark) .dashboard__upcoming-item {
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.dashboard__upcoming-item:last-child { border-bottom: none; }

.dashboard__upcoming-name {
  font-weight: 500;
  color: rgb(var(--p-surface-900));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:where(.dark) .dashboard__upcoming-name {
  color: rgb(var(--p-surface-0));
}

.dashboard__upcoming-unit {
  font-size: 13px;
}

.dashboard__upcoming-date {
  font-size: 13px;
}

.dashboard__upcoming-empty {
  padding: 16px 0;
  font-size: 14px;
}

.text-tabular {
  font-variant-numeric: tabular-nums;
}

.text-table-header {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(var(--p-surface-600));
}
</style>
