<template>
  <v-container>
    <h1 class="text-h4 mb-4">{{ isEdit ? 'Редактировать бронирование' : 'Новое бронирование' }}</h1>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <v-form ref="formRef" @submit.prevent="handleSubmit" :disabled="submitting">
      <v-select
        v-model="form.unit_id"
        label="Юнит"
        :items="units"
        item-title="label"
        item-value="id"
        :rules="[rules.required]"
        :disabled="isEdit"
        class="mb-2"
      />
      <v-select
        v-model="form.guest_id"
        label="Гость (необязательно)"
        :items="guests"
        item-title="label"
        item-value="id"
        clearable
        class="mb-2"
      />
      <v-text-field v-model="form.check_in" label="Дата заезда" type="date" :rules="[rules.required]" class="mb-2" />
      <v-text-field v-model="form.check_out" label="Дата выезда" type="date" :rules="[rules.required]" class="mb-2" />
      <v-text-field v-model.number="form.guests_count" label="Количество гостей" type="number" :rules="[rules.required, rules.minOne]" class="mb-2" />
      <v-text-field v-model.number="form.total_price_rub" label="Цена" type="number" step="0.01" class="mb-2" />
      <p v-if="priceWarning" class="text-warning text-caption mb-2">{{ priceWarning }}</p>
      <v-textarea v-model="form.notes" label="Заметки" rows="2" class="mb-4" />

      <div class="d-flex ga-2">
        <v-btn type="submit" color="primary" :loading="submitting">
          {{ isEdit ? 'Сохранить' : 'Создать' }}
        </v-btn>
        <v-btn variant="text" :to="'/reservations'">Отмена</v-btn>
      </div>
    </v-form>
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import * as reservationsApi from '../api/reservations'
import * as allUnitsApi from '../api/allUnits'
import * as guestsApi from '../api/guests'
import * as seasonalPricesApi from '../api/seasonalPrices'

const route = useRoute()
const router = useRouter()
const store = useReservationsStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const formError = ref(null)

const form = ref({
  unit_id: null,
  guest_id: null,
  check_in: '',
  check_out: '',
  guests_count: 1,
  total_price_rub: 0,
  notes: '',
})

const priceWarning = ref(null)
const units = ref([])
const unitDataMap = ref({}) // { unitId: { base_price_cents, seasonal_prices: [] } }
const guests = ref([])

// Auto-calculate price when unit + dates change
watch(
  () => [form.value.unit_id, form.value.check_in, form.value.check_out],
  async ([unitId, checkIn, checkOut]) => {
    if (!unitId || !checkIn || !checkOut || checkOut <= checkIn) return
    try {
      let data = unitDataMap.value[unitId]
      if (!data) {
        const sp = await seasonalPricesApi.list(unitId)
        const unitInfo = units.value.find((u) => u.id === unitId)
        data = { base_price_cents: unitInfo?.base_price_cents || 0, seasonal_prices: sp }
        unitDataMap.value[unitId] = data
      }
      // Calculate nightly
      let total = 0
      const start = new Date(checkIn)
      const end = new Date(checkOut)
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const ds = d.toISOString().slice(0, 10)
        const sp = data.seasonal_prices.find((s) => ds >= s.start_date && ds < s.end_date)
        total += sp ? sp.price_cents : data.base_price_cents
      }
      form.value.total_price_rub = (total / 100)
      priceWarning.value = null
    } catch (e) {
      console.warn('Price auto-calculation failed:', e)
      priceWarning.value = 'Не удалось рассчитать цену автоматически'
    }
  },
)

const rules = {
  required: (v) => (v !== '' && v !== null && v !== undefined) || 'Обязательное поле',
  minOne: (v) => (Number(v) >= 1) || 'Минимум 1',
}

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
    guests.value = gList.map((g) => ({ id: g.id, label: `${g.first_name} ${g.last_name}` }))
  } catch (e) { console.error(e);
    formError.value = 'Не удалось загрузить данные для формы'
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
      total_price_rub: (r.total_price_cents || 0) / 100,
      notes: r.notes || '',
    }
  } catch (e) { console.error(e);
    formError.value = 'Не удалось загрузить бронирование'
  }
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  formError.value = null
  const payload = { ...form.value, total_price_cents: Math.round((form.value.total_price_rub || 0) * 100) }
  delete payload.total_price_rub
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), payload)
    } else {
      await store.create(payload)
    }
    router.push('/reservations')
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || 'Ошибка сохранения'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadSelectors()
  loadReservation()
})

defineExpose({ form, formError, handleSubmit, isEdit, rules, submitting, units, guests, loadSelectors, loadReservation })
</script>
