<template>
  <v-container fluid class="pa-6 dashboard">
    <!-- Greeting -->
    <h1 class="dashboard__greeting text-h5 font-weight-bold mb-1">
      {{ $t('dashboard.greeting', { name: authStore.user?.full_name }) }}
    </h1>
    <p class="dashboard__org text-body-2 text-medium-emphasis mb-8">
      {{ authStore.organization?.name }}
    </p>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
      {{ error }}
    </v-alert>

    <template v-if="data">
      <!-- FT-031: Hero — revenue dominates, supporting metrics inline. No cards.
           Editorial hierarchy — owner scans this first for "сколько заработал". -->
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

        <!-- Slim occupancy bar — visual reinforcement of the % above. -->
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

      <!-- FT-031: Status breakdown — single horizontal stacked bar + legend.
           Replaces 4 identical saturated-colored cards. -->
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
          <span v-else class="dashboard__status-bar-empty text-medium-emphasis">—</span>
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

      <!-- FT-031: Upcoming — clean lists without icon-on-heading / bullet-dot-icons. -->
      <section class="dashboard__upcoming" data-testid="dashboard-upcoming">
        <v-row>
          <v-col cols="12" md="6">
            <h2 class="dashboard__upcoming-heading">{{ $t('dashboard.checkIns') }}</h2>
            <ul v-if="data.upcoming_check_ins.length" class="dashboard__upcoming-list">
              <li
                v-for="r in data.upcoming_check_ins"
                :key="r.id"
                class="dashboard__upcoming-item"
              >
                <span class="dashboard__upcoming-name">{{ r.guest_name || $t('common.blocking') }}</span>
                <span class="dashboard__upcoming-unit text-medium-emphasis">{{ r.unit_name }}</span>
                <span class="dashboard__upcoming-date text-tabular">{{ r.check_in }}</span>
              </li>
            </ul>
            <div v-else class="dashboard__upcoming-empty text-medium-emphasis">{{ $t('dashboard.noCheckIns') }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <h2 class="dashboard__upcoming-heading">{{ $t('dashboard.checkOuts') }}</h2>
            <ul v-if="data.upcoming_check_outs.length" class="dashboard__upcoming-list">
              <li
                v-for="r in data.upcoming_check_outs"
                :key="r.id"
                class="dashboard__upcoming-item"
              >
                <span class="dashboard__upcoming-name">{{ r.guest_name || $t('common.blocking') }}</span>
                <span class="dashboard__upcoming-unit text-medium-emphasis">{{ r.unit_name }}</span>
                <span class="dashboard__upcoming-date text-tabular">{{ r.check_out }}</span>
              </li>
            </ul>
            <div v-else class="dashboard__upcoming-empty text-medium-emphasis">{{ $t('dashboard.noCheckOuts') }}</div>
          </v-col>
        </v-row>
      </section>
    </template>
  </v-container>
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

// FT-031: Status segments — single source for bar + legend. `flexBasis`
// directly drives horizontal bar segment widths. Guards totalReservations=0.
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
    console.error(e)
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
   No saturated-card backgrounds, left-aligned, asymmetric density. */

.dashboard {
  max-width: 1280px;
}

.dashboard__greeting {
  font-family: var(--font-display);
  letter-spacing: var(--tracking-tight);
}

/* ── Hero ─────────────────────────────────────────────────────────── */
.dashboard__hero-label {
  margin-bottom: var(--space-xs, 8px);
}

.dashboard__hero-value {
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 4vw, 3.5rem);
  font-weight: 600;
  line-height: 1;
  letter-spacing: var(--tracking-tight);
  color: rgb(var(--v-theme-on-surface));
  overflow-wrap: anywhere;
  margin-bottom: var(--space-lg, 24px);
}

.dashboard__supporting {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xl, 32px);
  margin-bottom: var(--space-md, 16px);
}

.dashboard__stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs, 2px);
}

.dashboard__stat-value {
  font-family: var(--font-body);
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}

.dashboard__stat-label {
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.dashboard__occupancy-track {
  height: 2px;
  width: 100%;
  max-width: 480px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 2px;
  overflow: hidden;
}

.dashboard__occupancy-fill {
  height: 100%;
  background: rgb(var(--v-theme-primary));
  transition: width 0.3s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .dashboard__occupancy-fill { transition: none; }
}

/* ── Status breakdown ─────────────────────────────────────────────── */
.dashboard__status-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm, 12px);
  margin-bottom: var(--space-sm, 12px);
}

.dashboard__status-total {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}

.dashboard__status-bar {
  display: flex;
  height: 8px;
  width: 100%;
  max-width: 720px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-md, 16px);
}

.dashboard__status-bar-segment {
  height: 100%;
  transition: flex-basis 0.3s ease-out;
}

.dashboard__status-bar-segment--confirmed   { background: rgb(var(--v-theme-status-confirmed)); }
.dashboard__status-bar-segment--checked-in  { background: rgb(var(--v-theme-status-checked-in)); }
.dashboard__status-bar-segment--checked-out { background: rgb(var(--v-theme-status-checked-out)); }
.dashboard__status-bar-segment--cancelled   { background: rgb(var(--v-theme-status-cancelled)); }

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
  gap: var(--space-lg, 24px) var(--space-md, 16px);
  list-style: none;
  padding: 0;
  margin: 0;
}

.dashboard__status-legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 8px);
  font-size: 13px;
}

.dashboard__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dashboard__status-dot--confirmed   { background: rgb(var(--v-theme-status-confirmed)); }
.dashboard__status-dot--checked-in  { background: rgb(var(--v-theme-status-checked-in)); }
.dashboard__status-dot--checked-out { background: rgb(var(--v-theme-status-checked-out)); }
.dashboard__status-dot--cancelled   { background: rgb(var(--v-theme-status-cancelled)); }

.dashboard__status-legend-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.dashboard__status-legend-count {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

/* ── Upcoming ─────────────────────────────────────────────────────── */
.dashboard__upcoming-heading {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-bottom: var(--space-sm, 12px);
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
  gap: var(--space-md, 16px);
  padding: var(--space-sm, 12px) 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 14px;
}

.dashboard__upcoming-item:last-child { border-bottom: none; }

.dashboard__upcoming-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard__upcoming-unit {
  font-size: 13px;
}

.dashboard__upcoming-date {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.dashboard__upcoming-empty {
  padding: var(--space-md, 16px) 0;
  font-size: 14px;
}
</style>
