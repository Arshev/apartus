<template>
  <v-app>
    <v-container class="pa-4" style="max-width: 600px">
      <h2 class="text-h5 mb-4">Забронировать — {{ orgName }}</h2>

      <v-text-field v-model="checkIn" label="Дата заезда" type="date" class="mb-2" />
      <v-text-field v-model="checkOut" label="Дата выезда" type="date" class="mb-2" />
      <v-btn color="primary" :loading="searching" @click="search" class="mb-4">Найти</v-btn>

      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

      <div v-if="units.length">
        <v-card v-for="unit in units" :key="unit.id" class="mb-3" variant="outlined">
          <v-card-title>{{ unit.property_name }} — {{ unit.name }}</v-card-title>
          <v-card-subtitle>{{ unit.unit_type }} · до {{ unit.capacity }} гостей · {{ formatPrice(unit.total_price_cents) }}</v-card-subtitle>
          <v-card-actions>
            <v-btn color="primary" size="small" @click="selectUnit(unit)">Забронировать</v-btn>
          </v-card-actions>
        </v-card>
      </div>

      <v-empty-state v-else-if="searched && !searching" icon="mdi-calendar-remove" title="Нет доступных юнитов" />

      <v-dialog v-model="bookingDialog" max-width="400">
        <v-card>
          <v-card-title>Бронирование</v-card-title>
          <v-card-text>
            <p class="mb-2"><strong>{{ selectedUnit?.property_name }} — {{ selectedUnit?.name }}</strong></p>
            <p class="mb-4">{{ checkIn }} → {{ checkOut }} · {{ formatPrice(selectedUnit?.total_price_cents) }}</p>
            <v-text-field v-model="guestName" label="Ваше имя" class="mb-2" />
            <v-text-field v-model="guestEmail" label="Email" type="email" class="mb-2" />
            <v-text-field v-model="guestPhone" label="Телефон" class="mb-2" />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="bookingDialog = false">Отмена</v-btn>
            <v-btn color="primary" :loading="booking" @click="confirmBooking">Подтвердить</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="successDialog" max-width="400">
        <v-card>
          <v-card-title>Бронирование подтверждено!</v-card-title>
          <v-card-text>Мы отправили подтверждение на ваш email.</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="primary" @click="successDialog = false">Ок</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import * as publicBookingApi from '../api/publicBooking'

const route = useRoute()
const slug = route.params.slug

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
  return cents > 0 ? `${(cents / 100).toFixed(0)} ₽` : 'Бесплатно'
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
  } catch {
    error.value = 'Не удалось загрузить доступность'
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
    error.value = e.response?.data?.error?.join?.(', ') || e.response?.data?.error || 'Ошибка бронирования'
  } finally {
    booking.value = false
  }
}

defineExpose({ search, selectUnit, confirmBooking, formatPrice, units, orgName, checkIn, checkOut, error })
</script>
