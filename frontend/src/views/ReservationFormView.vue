<template>
  <div class="reservation-form-container mx-auto px-4 py-6">
    <h1 class="reservation-form-container__heading">
      {{ isEdit ? $t('reservations.editTitle') : $t('reservations.createTitle') }}
    </h1>

    <div
      v-if="formError"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span class="flex-1">
        {{ Array.isArray(formError) ? formError.join(', ') : formError }}
      </span>
      <button
        type="button"
        class="text-red-500 hover:text-red-700"
        :aria-label="$t('common.close')"
        @click="formError = null"
      >
        <i class="pi pi-times" />
      </button>
    </div>

    <div class="reservation-form-grid">
      <form
        class="reservation-form-grid__form"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <ReservationFormSection id="section-unit-dates" :title="$t('reservations.form.sections.unitDates')">
          <div>
            <label for="res-unit" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('reservations.form.unit') }}
            </label>
            <Select
              id="res-unit"
              v-model="form.unit_id"
              :options="units"
              option-label="label"
              option-value="id"
              :disabled="isEdit"
              filter
              class="w-full"
              :invalid="!!fieldErrors.unit_id"
              @change="validateField('unit_id')"
            />
            <p v-if="fieldErrors.unit_id" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ $t(fieldErrors.unit_id) }}
            </p>
          </div>
          <ReservationDateRangePicker v-model="dateRange" />
        </ReservationFormSection>

        <ReservationFormSection id="section-guest" :title="$t('reservations.form.sections.guest')">
          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label for="res-guest" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('reservations.form.guest') }}
              </label>
              <Select
                id="res-guest"
                v-model="form.guest_id"
                :options="guests"
                option-label="label"
                option-value="id"
                show-clear
                filter
                class="w-full"
              />
            </div>
            <Button
              icon="pi pi-plus"
              severity="secondary"
              variant="outlined"
              :title="$t('reservations.form.addGuest')"
              :aria-label="$t('reservations.form.addGuest')"
              @click="guestDialogOpen = true"
            />
          </div>
        </ReservationFormSection>

        <ReservationFormSection id="section-pricing" :title="$t('reservations.form.sections.pricing')">
          <div>
            <label for="res-price" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('reservations.form.totalPrice') }}
            </label>
            <div class="relative">
              <span
                v-if="currencyConfig.position === 'before'"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-600 dark:text-surface-400 pointer-events-none"
              >
                {{ currencyConfig.symbol }}
              </span>
              <InputText
                id="res-price"
                :model-value="totalPriceUnits"
                type="number"
                step="0.01"
                :class="[
                  'w-full',
                  currencyConfig.position === 'before' ? 'pl-8' : 'pr-8',
                ]"
                @update:model-value="onTotalInput"
              />
              <span
                v-if="currencyConfig.position === 'after'"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-surface-600 dark:text-surface-400 pointer-events-none"
              >
                {{ currencyConfig.symbol }}
              </span>
            </div>
          </div>
          <div>
            <label for="res-count" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('reservations.form.guestsCount') }}
            </label>
            <InputText
              id="res-count"
              v-model.number="form.guests_count"
              type="number"
              class="w-full"
              :invalid="!!fieldErrors.guests_count"
              @blur="validateField('guests_count')"
            />
            <p v-if="fieldErrors.guests_count" class="mt-1 text-xs text-red-600 dark:text-red-400">
              {{ $t(fieldErrors.guests_count) }}
            </p>
          </div>
        </ReservationFormSection>

        <ReservationFormSection id="section-notes" :title="$t('reservations.form.sections.notes')">
          <div>
            <label for="res-notes" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('common.form.notes') }}
            </label>
            <Textarea id="res-notes" v-model="form.notes" rows="3" class="w-full" />
          </div>
        </ReservationFormSection>

        <div class="flex gap-2">
          <Button
            type="submit"
            :label="isEdit ? $t('common.save') : $t('common.create')"
            :loading="submitting"
          />
          <Button
            type="button"
            :label="$t('common.cancel')"
            severity="secondary"
            variant="text"
            @click="$router.push('/reservations')"
          />
        </div>
      </form>

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
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import * as reservationsApi from '../api/reservations'
import * as allUnitsApi from '../api/allUnits'
import * as guestsApi from '../api/guests'
import * as seasonalPricesApi from '../api/seasonalPrices'
import { centsToUnits, unitsToCents, getCurrencySymbol } from '../utils/currency'
import { reservationSchema, validate } from '../schemas/reservation'
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
const submitting = ref(false)
const formError = ref(null)
const fieldErrors = ref({})
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

// Legacy shim preserved for test compat — rules object with same shape.
const rules = {
  required: (v) =>
    (v !== '' && v !== null && v !== undefined) || t('common.validation.required'),
  minOne: (v) => Number(v) >= 1 || t('common.validation.minOne'),
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

function validateField(field) {
  const { errors } = validate(reservationSchema, buildPayload())
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] || '' }
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
  const { valid, errors } = validate(reservationSchema, buildPayload())
  fieldErrors.value = errors
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
  fieldErrors,
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
  validateField,
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
  color: var(--p-surface-900, #171c19);
}

:where(.dark) .reservation-form-container__heading {
  color: var(--p-surface-0, #e1e6e2);
}

.reservation-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 32px;
  align-items: start;
}

.reservation-form-grid__form {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
