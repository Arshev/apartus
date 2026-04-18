<template>
  <v-container class="reservation-form-container">
    <h1 class="reservation-form-container__heading">
      {{ isEdit ? $t('reservations.editTitle') : $t('reservations.createTitle') }}
    </h1>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <div class="reservation-form-grid">
      <v-form
        ref="formRef"
        class="reservation-form-grid__form"
        :disabled="submitting"
        @submit.prevent="handleSubmit"
      >
        <ReservationFormSection id="section-unit-dates" :title="$t('reservations.form.sections.unitDates')">
          <v-autocomplete
            v-model="form.unit_id"
            :label="$t('reservations.form.unit')"
            :items="units"
            item-title="label"
            item-value="id"
            :rules="[rules.required]"
            :disabled="isEdit"
          />
          <ReservationDateRangePicker v-model="dateRange" />
        </ReservationFormSection>

        <ReservationFormSection id="section-guest" :title="$t('reservations.form.sections.guest')">
          <div class="d-flex align-center ga-2">
            <v-autocomplete
              v-model="form.guest_id"
              :label="$t('reservations.form.guest')"
              :items="guests"
              item-title="label"
              item-value="id"
              clearable
              style="flex: 1"
            />
            <v-btn
              icon="mdi-plus"
              variant="tonal"
              size="small"
              :title="$t('reservations.form.addGuest')"
              @click="guestDialogOpen = true"
            />
          </div>
        </ReservationFormSection>

        <ReservationFormSection id="section-pricing" :title="$t('reservations.form.sections.pricing')">
          <v-text-field
            :model-value="totalPriceUnits"
            :label="$t('reservations.form.totalPrice')"
            type="number"
            step="0.01"
            :prefix="currencyConfig.position === 'before' ? currencyConfig.symbol : ''"
            :suffix="currencyConfig.position === 'after' ? currencyConfig.symbol : ''"
            @update:model-value="onTotalInput"
          />
          <v-text-field
            v-model.number="form.guests_count"
            :label="$t('reservations.form.guestsCount')"
            type="number"
            :rules="[rules.required, rules.minOne]"
          />
        </ReservationFormSection>

        <ReservationFormSection id="section-notes" :title="$t('reservations.form.sections.notes')">
          <v-textarea v-model="form.notes" :label="$t('common.form.notes')" rows="3" />
        </ReservationFormSection>

        <div class="d-flex ga-2">
          <v-btn type="submit" color="primary" :loading="submitting">
            {{ isEdit ? $t('common.save') : $t('common.create') }}
          </v-btn>
          <v-btn variant="text" :to="'/reservations'">{{ $t('common.cancel') }}</v-btn>
        </div>
      </v-form>

      <aside class="reservation-form-grid__summary">
        <ReservationPriceSummary
          :check-in="form.check_in"
          :check-out="form.check_out"
          :unit-id="form.unit_id"
          :base-price-cents="activeUnitBaseCents"
          :seasonal-prices="activeSeasonalPrices"
          :currency="currency"
          :auto-total-cents="autoTotalCents"
          :manual-total-cents="form.total_price_cents"
          :manual-override="manualOverride"
          @recalc="onRecalc"
        />
      </aside>
    </div>

    <GuestQuickCreateDialog v-model="guestDialogOpen" @created="onGuestCreated" />
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import * as reservationsApi from '../api/reservations'
import * as allUnitsApi from '../api/allUnits'
import * as guestsApi from '../api/guests'
import * as seasonalPricesApi from '../api/seasonalPrices'
import { centsToUnits, unitsToCents, getCurrencySymbol } from '../utils/currency'
import ReservationFormSection from '../components/ReservationFormSection.vue'
import ReservationDateRangePicker from '../components/ReservationDateRangePicker.vue'
import ReservationPriceSummary from '../components/ReservationPriceSummary.vue'
import GuestQuickCreateDialog from '../components/GuestQuickCreateDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useReservationsStore()
const authStore = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const formError = ref(null)
const manualOverride = ref(false)
const guestDialogOpen = ref(false)

const form = ref({
  unit_id: null,
  guest_id: null,
  check_in: '',
  check_out: '',
  guests_count: 1,
  total_price_cents: 0,
  notes: '',
})

const units = ref([])
const unitDataMap = ref({})
const guests = ref([])

const currency = computed(() => authStore.organization?.currency || 'RUB')

const CURRENCY_BEFORE = ['$', '€', '£', 'Rp', '₺']
const currencyConfig = computed(() => {
  const symbol = getCurrencySymbol(currency.value)
  return { symbol, position: CURRENCY_BEFORE.includes(symbol) ? 'before' : 'after' }
})

const activeUnit = computed(
  () => units.value.find((u) => u.id === form.value.unit_id) || null,
)
const activeUnitBaseCents = computed(() => activeUnit.value?.base_price_cents || 0)
const activeSeasonalPrices = computed(
  () => unitDataMap.value[form.value.unit_id]?.seasonal_prices || [],
)

const totalPriceUnits = computed(() => centsToUnits(form.value.total_price_cents || 0))

const dateRange = computed({
  get: () => ({ checkIn: form.value.check_in, checkOut: form.value.check_out }),
  set: (val) => {
    form.value.check_in = val?.checkIn || ''
    form.value.check_out = val?.checkOut || ''
  },
})

const autoTotalCents = computed(() => {
  const { check_in, check_out, unit_id } = form.value
  if (!unit_id || !check_in || !check_out) return 0
  const basePrice = activeUnitBaseCents.value
  const seasonals = activeSeasonalPrices.value
  const start = new Date(check_in + 'T00:00:00Z')
  const end = new Date(check_out + 'T00:00:00Z')
  if (end <= start) return 0
  let total = 0
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ds = d.toISOString().slice(0, 10)
    const sp = seasonals.find((s) => ds >= s.start_date && ds < s.end_date)
    total += sp ? sp.price_cents : basePrice
  }
  return total
})

const rules = {
  required: (v) =>
    (v !== '' && v !== null && v !== undefined) || t('common.validation.required'),
  minOne: (v) => Number(v) >= 1 || t('common.validation.minOne'),
}

function onTotalInput(value) {
  manualOverride.value = true
  form.value.total_price_cents = unitsToCents(Number(value) || 0)
}

function onRecalc() {
  manualOverride.value = false
  form.value.total_price_cents = autoTotalCents.value
}

function onGuestCreated(guest) {
  guests.value = [
    ...guests.value,
    { id: guest.id, label: `${guest.first_name} ${guest.last_name}` },
  ]
  form.value.guest_id = guest.id
  guestDialogOpen.value = false
}

function buildPayload() {
  return {
    unit_id: form.value.unit_id,
    guest_id: form.value.guest_id,
    check_in: form.value.check_in,
    check_out: form.value.check_out,
    guests_count: form.value.guests_count,
    total_price_cents: form.value.total_price_cents,
    notes: form.value.notes,
  }
}

async function ensureUnitData(unitId) {
  if (!unitId || unitDataMap.value[unitId]) return
  try {
    const sp = await seasonalPricesApi.list(unitId)
    unitDataMap.value[unitId] = { seasonal_prices: sp || [] }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Seasonal prices load failed:', e)
    unitDataMap.value[unitId] = { seasonal_prices: [] }
  }
}

watch(
  () => [form.value.unit_id, form.value.check_in, form.value.check_out],
  async ([unitId], [prevUnitId]) => {
    if (unitId && prevUnitId != null && unitId !== prevUnitId) {
      manualOverride.value = false
    }
    if (!unitId) return
    await ensureUnitData(unitId)
    if (!manualOverride.value) {
      form.value.total_price_cents = autoTotalCents.value
    }
  },
)

async function loadSelectors() {
  try {
    const [unitsList, gList] = await Promise.all([
      allUnitsApi.list(),
      guestsApi.list(),
    ])
    units.value = unitsList.map((u) => ({
      id: u.id,
      label: `${u.property_name} → ${u.name}`,
      base_price_cents: u.base_price_cents || 0,
    }))
    guests.value = gList.map((g) => ({
      id: g.id,
      label: `${g.first_name} ${g.last_name}`,
    }))
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('reservations.messages.formLoadError')
  }
}

async function loadReservation() {
  if (!isEdit.value) return
  try {
    const r = await reservationsApi.get(route.params.id)
    form.value = {
      unit_id: r.unit_id,
      guest_id: r.guest_id,
      check_in: r.check_in,
      check_out: r.check_out,
      guests_count: r.guests_count,
      total_price_cents: r.total_price_cents || 0,
      notes: r.notes || '',
    }
    manualOverride.value = true
    if (r.unit_id) await ensureUnitData(r.unit_id)
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('reservations.messages.loadError')
  }
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  submitting.value = true
  formError.value = null
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), buildPayload())
    } else {
      await store.create(buildPayload())
    }
    router.push('/reservations')
  } catch (e) {
    formError.value =
      e.response?.data?.error || store.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadSelectors()
  loadReservation()
})

defineExpose({
  form,
  formError,
  handleSubmit,
  isEdit,
  rules,
  submitting,
  units,
  guests,
  manualOverride,
  guestDialogOpen,
  currency,
  autoTotalCents,
  dateRange,
  onTotalInput,
  onRecalc,
  onGuestCreated,
  buildPayload,
  loadSelectors,
  loadReservation,
})
</script>

<style scoped>
.reservation-form-container {
  max-width: 1200px;
}

.reservation-form-container__heading {
  font-family: var(--font-display, inherit);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
  color: rgb(var(--v-theme-on-surface));
}

.reservation-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 32px;
  align-items: start;
}

.reservation-form-grid__form {
  min-width: 0;
}

.reservation-form-grid__summary {
  position: relative;
}

@media (max-width: 959px) {
  .reservation-form-grid {
    grid-template-columns: 1fr;
  }
  .reservation-form-grid__summary {
    order: -1;
  }
}
</style>
