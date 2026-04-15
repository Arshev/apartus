<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-btn variant="text" icon="mdi-arrow-left" :to="`/properties/${propertyId}/units`" />
      <h1 class="text-h4 ml-2">{{ isEdit ? $t('units.editTitle') : $t('units.createTitle') }}</h1>
    </div>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <v-form ref="formRef" @submit.prevent="handleSubmit" :disabled="submitting">
      <v-text-field
        v-model="form.name"
        :label="$t('units.form.name')"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-select
        v-model="form.unit_type"
        :label="$t('units.form.unitType')"
        :items="unitTypes"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-text-field
        v-model.number="form.capacity"
        :label="$t('units.form.capacity')"
        type="number"
        :rules="[rules.required, rules.capacityRange]"
        class="mb-2"
      />
      <v-select
        v-model="form.status"
        :label="$t('units.form.status')"
        :items="statuses"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-text-field
        v-model.number="form.base_price_rub"
        :label="$t('units.form.pricePerNight')"
        type="number"
        step="0.01"
        class="mb-2"
      />

      <div v-if="isEdit" class="mb-4">
        <label class="text-subtitle-2 text-medium-emphasis mb-1 d-block">{{ $t('units.form.amenities') }}</label>
        <v-chip-group>
          <v-chip
            v-for="amenity in allAmenities"
            :key="amenity.id"
            :color="isAmenityAttached(amenity.id) ? 'primary' : undefined"
            :variant="isAmenityAttached(amenity.id) ? 'elevated' : 'outlined'"
            @click="toggleAmenity(amenity.id)"
            :disabled="togglingAmenity === amenity.id"
          >
            {{ amenity.name }}
          </v-chip>
        </v-chip-group>
        <p v-if="amenitiesError" class="text-error text-caption">{{ amenitiesError }}</p>
      </div>

      <div class="d-flex ga-2">
        <v-btn type="submit" color="primary" :loading="submitting">
          {{ isEdit ? $t('common.save') : $t('common.create') }}
        </v-btn>
        <v-btn variant="text" :to="`/properties/${propertyId}/units`">{{ $t('common.cancel') }}</v-btn>
      </div>
    </v-form>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUnitsStore } from '../stores/units'
import * as unitsApi from '../api/units'
import * as amenitiesApi from '../api/amenities'
import * as unitAmenitiesApi from '../api/unitAmenities'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUnitsStore()

const propertyId = computed(() => route.params.propertyId)
const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const formError = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

const allAmenities = ref([])
const attachedAmenityIds = ref([])
const amenitiesError = ref(null)
const togglingAmenity = ref(null)

const form = ref({
  name: '',
  unit_type: '',
  capacity: null,
  status: 'available',
  base_price_rub: 0,
})

const unitTypes = computed(() => [
  { label: t('units.types.room'), value: 'room' },
  { label: t('units.types.apartment'), value: 'apartment' },
  { label: t('units.types.bed'), value: 'bed' },
  { label: t('units.types.studio'), value: 'studio' },
])

const statuses = computed(() => [
  { label: t('units.statuses.available'), value: 'available' },
  { label: t('units.statuses.maintenance'), value: 'maintenance' },
  { label: t('units.statuses.blocked'), value: 'blocked' },
])

const rules = {
  required: (v) => (v !== '' && v !== null && v !== undefined) || t('common.validation.required'),
  capacityRange: (v) => (Number(v) >= 1 && Number(v) <= 100) || t('common.validation.capacityRange'),
}

async function loadUnit() {
  if (!isEdit.value) return
  try {
    const unit = await unitsApi.get(propertyId.value, route.params.id)
    form.value = {
      name: unit.name,
      unit_type: unit.unit_type,
      capacity: unit.capacity,
      status: unit.status,
      base_price_rub: (unit.base_price_cents || 0) / 100,
    }
  } catch (e) { console.error(e);
    formError.value = t('units.messages.loadError')
  }
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  formError.value = null
  const payload = { ...form.value, base_price_cents: Math.round((form.value.base_price_rub || 0) * 100) }
  delete payload.base_price_rub
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), payload)
      snackbarText.value = t('units.messages.updated')
    } else {
      if (!store.propertyId || store.propertyId !== propertyId.value) {
        store.propertyId = propertyId.value
      }
      await store.create(payload)
      snackbarText.value = t('units.messages.created')
    }
    snackbar.value = true
    router.push(`/properties/${propertyId.value}/units`)
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

function isAmenityAttached(amenityId) {
  return attachedAmenityIds.value.includes(amenityId)
}

async function toggleAmenity(amenityId) {
  togglingAmenity.value = amenityId
  amenitiesError.value = null
  try {
    if (isAmenityAttached(amenityId)) {
      await unitAmenitiesApi.detach(route.params.id, amenityId)
      attachedAmenityIds.value = attachedAmenityIds.value.filter((id) => id !== amenityId)
    } else {
      await unitAmenitiesApi.attach(route.params.id, amenityId)
      attachedAmenityIds.value.push(amenityId)
    }
  } catch (e) { console.error(e);
    amenitiesError.value = t('units.messages.amenitiesError')
  } finally {
    togglingAmenity.value = null
  }
}

async function loadAmenities() {
  if (!isEdit.value) return
  try {
    const [all, attached] = await Promise.all([
      amenitiesApi.list(),
      unitAmenitiesApi.list(route.params.id),
    ])
    allAmenities.value = all
    attachedAmenityIds.value = attached.map((a) => a.id)
  } catch (e) { console.error(e);
    amenitiesError.value = t('units.messages.amenitiesLoadError')
  }
}

onMounted(() => {
  loadUnit()
  loadAmenities()
})

defineExpose({
  form, formError, handleSubmit, isEdit, rules, submitting, loadUnit, propertyId,
  allAmenities, attachedAmenityIds, amenitiesError, togglingAmenity,
  isAmenityAttached, toggleAmenity, loadAmenities,
})
</script>
