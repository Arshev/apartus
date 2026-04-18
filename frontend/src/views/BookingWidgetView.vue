<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <div class="max-w-xl mx-auto px-4 py-8">
      <h2 class="text-2xl font-display font-medium tracking-tight mb-6 text-surface-950 dark:text-surface-50">
        {{ $t('bookingWidget.title', { orgName }) }}
      </h2>

      <form class="space-y-4 mb-6" @submit.prevent="search">
        <div>
          <label for="bw-checkin" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('bookingWidget.form.checkIn') }}
          </label>
          <InputText id="bw-checkin" v-model="checkIn" type="date" class="w-full" />
        </div>
        <div>
          <label for="bw-checkout" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('bookingWidget.form.checkOut') }}
          </label>
          <InputText id="bw-checkout" v-model="checkOut" type="date" class="w-full" />
        </div>
        <Button
          type="submit"
          :label="$t('bookingWidget.searchButton')"
          :loading="searching"
        />
      </form>

      <div
        v-if="error"
        class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
      >
        <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
        <span>{{ error }}</span>
      </div>

      <div v-if="units.length" class="space-y-3">
        <div
          v-for="unit in units"
          :key="unit.id"
          class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 p-4"
        >
          <h3 class="font-display font-medium text-surface-900 dark:text-surface-100">
            {{ unit.property_name }} — {{ unit.name }}
          </h3>
          <p class="text-sm text-surface-600 dark:text-surface-400 mt-1">
            {{ unit.unit_type }} · {{ $t('bookingWidget.guestsLabel', { n: unit.capacity }) }}
            · <span class="tabular-nums">{{ formatPrice(unit.total_price_cents) }}</span>
          </p>
          <div class="mt-3">
            <Button
              :label="$t('bookingWidget.bookButton')"
              size="small"
              @click="selectUnit(unit)"
            />
          </div>
        </div>
      </div>

      <div
        v-else-if="searched && !searching"
        class="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
      >
        <i class="pi pi-calendar-times text-4xl text-surface-400 mb-3" aria-hidden="true" />
        <h3 class="text-base font-medium text-surface-900 dark:text-surface-100">
          {{ $t('bookingWidget.emptyState.title') }}
        </h3>
      </div>

      <Dialog
        v-model:visible="bookingDialog"
        :header="$t('bookingWidget.dialog.bookingTitle')"
        modal
        :style="{ width: '400px' }"
      >
        <div class="space-y-3">
          <p class="text-sm text-surface-900 dark:text-surface-100">
            <strong>{{ selectedUnit?.property_name }} — {{ selectedUnit?.name }}</strong>
          </p>
          <p class="text-sm text-surface-600 dark:text-surface-400">
            {{ checkIn }} → {{ checkOut }} ·
            <span class="tabular-nums">{{ formatPrice(selectedUnit?.total_price_cents) }}</span>
          </p>
          <div>
            <label for="bw-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('bookingWidget.form.guestName') }}
            </label>
            <InputText id="bw-name" v-model="guestName" class="w-full" />
          </div>
          <div>
            <label for="bw-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('bookingWidget.form.guestEmail') }}
            </label>
            <InputText id="bw-email" v-model="guestEmail" type="email" class="w-full" />
          </div>
          <div>
            <label for="bw-phone" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
              {{ $t('bookingWidget.form.guestPhone') }}
            </label>
            <InputText id="bw-phone" v-model="guestPhone" class="w-full" />
          </div>
        </div>
        <template #footer>
          <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="bookingDialog = false" />
          <Button :label="$t('bookingWidget.confirmButton')" :loading="booking" @click="confirmBooking" />
        </template>
      </Dialog>

      <Dialog
        v-model:visible="successDialog"
        :header="$t('bookingWidget.dialog.successTitle')"
        modal
        :style="{ width: '400px' }"
      >
        <p class="text-sm">{{ $t('bookingWidget.dialog.successText') }}</p>
        <template #footer>
          <Button :label="$t('common.ok')" @click="successDialog = false" />
        </template>
      </Dialog>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Dialog from 'primevue/dialog'
import * as publicBookingApi from '../api/publicBooking'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()
const route = useRoute()
const slug = route.params.slug
const orgCurrency = ref('RUB')

const checkIn = ref('')
const checkOut = ref('')
const units = ref([])
const orgName = ref('')
const searching = ref(false)
const searched = ref(false)
const error = ref(null)

const bookingDialog = ref(false)
const selectedUnit = ref(null)
const guestName = ref('')
const guestEmail = ref('')
const guestPhone = ref('')
const booking = ref(false)
const successDialog = ref(false)

function formatPrice(cents) {
  return cents > 0 ? formatMoney(cents, orgCurrency.value) : t('common.free')
}

async function search() {
  if (!checkIn.value || !checkOut.value) return
  searching.value = true
  error.value = null
  searched.value = true
  try {
    const data = await publicBookingApi.getAvailability(slug, checkIn.value, checkOut.value)
    units.value = data.units
    orgName.value = data.organization
    orgCurrency.value = data.currency || 'RUB'
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    error.value = t('bookingWidget.messages.loadError')
  } finally {
    searching.value = false
  }
}

function selectUnit(unit) {
  selectedUnit.value = unit
  bookingDialog.value = true
}

async function confirmBooking() {
  booking.value = true
  error.value = null
  try {
    await publicBookingApi.createBooking(slug, {
      unit_id: selectedUnit.value.id,
      check_in: checkIn.value,
      check_out: checkOut.value,
      guest_name: guestName.value,
      guest_email: guestEmail.value,
      guest_phone: guestPhone.value,
      guests_count: 1,
    })
    bookingDialog.value = false
    successDialog.value = true
    units.value = []
  } catch (e) {
    error.value = e.response?.data?.error?.join?.(', ') || e.response?.data?.error || t('bookingWidget.messages.bookingError')
  } finally {
    booking.value = false
  }
}

defineExpose({ search, selectUnit, confirmBooking, formatPrice, units, orgName, checkIn, checkOut, error })
</script>
