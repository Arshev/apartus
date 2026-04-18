<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <div class="flex items-center gap-2 mb-6">
      <RouterLink
        :to="`/properties/${propertyId}/units`"
        class="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        :aria-label="$t('common.cancel')"
      >
        <i class="pi pi-arrow-left" aria-hidden="true" />
      </RouterLink>
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ isEdit ? $t('units.editTitle') : $t('units.createTitle') }}
      </h1>
    </div>

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

    <form @submit.prevent="handleSubmit" class="space-y-4" novalidate>
      <div>
        <label for="unit-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('units.form.name') }}
        </label>
        <InputText
          id="unit-name"
          v-model="form.name"
          class="w-full"
          :invalid="!!fieldErrors.name"
          @blur="validateField('name')"
        />
        <p v-if="fieldErrors.name" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.name) }}
        </p>
      </div>

      <div>
        <label for="unit-type" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('units.form.unitType') }}
        </label>
        <Select
          id="unit-type"
          v-model="form.unit_type"
          :options="unitTypes"
          option-label="label"
          option-value="value"
          class="w-full"
          :invalid="!!fieldErrors.unit_type"
          @change="validateField('unit_type')"
        />
        <p v-if="fieldErrors.unit_type" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.unit_type) }}
        </p>
      </div>

      <div>
        <label for="unit-capacity" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('units.form.capacity') }}
        </label>
        <InputText
          id="unit-capacity"
          v-model.number="form.capacity"
          type="number"
          class="w-full"
          :invalid="!!fieldErrors.capacity"
          @blur="validateField('capacity')"
        />
        <p v-if="fieldErrors.capacity" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.capacity) }}
        </p>
      </div>

      <div>
        <label for="unit-status" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('units.form.status') }}
        </label>
        <Select
          id="unit-status"
          v-model="form.status"
          :options="statuses"
          option-label="label"
          option-value="value"
          class="w-full"
          :invalid="!!fieldErrors.status"
          @change="validateField('status')"
        />
        <p v-if="fieldErrors.status" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.status) }}
        </p>
      </div>

      <div>
        <label for="unit-price" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('units.form.pricePerNight') }}
        </label>
        <InputText
          id="unit-price"
          v-model.number="form.base_price_rub"
          type="number"
          step="0.01"
          class="w-full"
        />
      </div>

      <div v-if="isEdit" class="pt-2">
        <label class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-2">
          {{ $t('units.form.amenities') }}
        </label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="amenity in allAmenities"
            :key="amenity.id"
            type="button"
            :disabled="togglingAmenity === amenity.id"
            :class="[
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors',
              isAmenityAttached(amenity.id)
                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-200 border border-primary-300 dark:border-primary-700'
                : 'bg-surface-50 dark:bg-surface-800 text-surface-700 dark:text-surface-300 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700',
              togglingAmenity === amenity.id ? 'opacity-60 cursor-wait' : '',
            ]"
            @click="toggleAmenity(amenity.id)"
          >
            <i
              v-if="isAmenityAttached(amenity.id)"
              class="pi pi-check text-xs"
              aria-hidden="true"
            />
            {{ amenity.name }}
          </button>
        </div>
        <p v-if="amenitiesError" class="mt-2 text-xs text-red-600 dark:text-red-400">
          {{ amenitiesError }}
        </p>
      </div>

      <div class="flex gap-2 pt-2">
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
          @click="$router.push(`/properties/${propertyId}/units`)"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useUnitsStore } from '../stores/units'
import * as unitsApi from '../api/units'
import * as amenitiesApi from '../api/amenities'
import * as unitAmenitiesApi from '../api/unitAmenities'
import { unitSchema, UNIT_TYPES, UNIT_STATUSES, validate } from '../schemas/unit'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useUnitsStore()
const toast = useToast()

const propertyId = computed(() => route.params.propertyId)
const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const formError = ref(null)
const fieldErrors = ref({})

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

const unitTypes = computed(() =>
  UNIT_TYPES.map((value) => ({ value, label: t(`units.types.${value}`) })),
)

const statuses = computed(() =>
  UNIT_STATUSES.map((value) => ({ value, label: t(`units.statuses.${value}`) })),
)

function toSchemaData() {
  return {
    ...form.value,
    base_price_cents: Math.round((form.value.base_price_rub || 0) * 100),
  }
}

function validateField(field) {
  const { errors } = validate(unitSchema, toSchemaData())
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] || '' }
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
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('units.messages.loadError')
  }
}

async function handleSubmit() {
  const { valid, errors } = validate(unitSchema, toSchemaData())
  fieldErrors.value = errors
  if (!valid) return

  submitting.value = true
  formError.value = null
  const payload = {
    ...form.value,
    base_price_cents: Math.round((form.value.base_price_rub || 0) * 100),
  }
  delete payload.base_price_rub

  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), payload)
      toast.add({ severity: 'success', summary: t('units.messages.updated'), life: 3000 })
    } else {
      if (!store.propertyId || store.propertyId !== propertyId.value) {
        store.propertyId = propertyId.value
      }
      await store.create(payload)
      toast.add({ severity: 'success', summary: t('units.messages.created'), life: 3000 })
    }
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
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
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
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    amenitiesError.value = t('units.messages.amenitiesLoadError')
  }
}

onMounted(() => {
  loadUnit()
  loadAmenities()
})

defineExpose({
  form, formError, fieldErrors, submitting, isEdit, propertyId,
  allAmenities, attachedAmenityIds, amenitiesError, togglingAmenity,
  validateField, handleSubmit, loadUnit, loadAmenities,
  isAmenityAttached, toggleAmenity,
})
</script>
