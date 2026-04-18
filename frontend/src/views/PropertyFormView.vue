<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-display font-medium tracking-tight mb-6 text-surface-950 dark:text-surface-50">
      {{ isEdit ? $t('properties.editTitle') : $t('properties.createTitle') }}
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

    <form @submit.prevent="handleSubmit" class="space-y-4" novalidate>
      <div>
        <label for="prop-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('properties.form.name') }}
        </label>
        <InputText
          id="prop-name"
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
        <label for="prop-address" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('properties.form.address') }}
        </label>
        <InputText
          id="prop-address"
          v-model="form.address"
          class="w-full"
          :invalid="!!fieldErrors.address"
          @blur="validateField('address')"
        />
        <p v-if="fieldErrors.address" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.address) }}
        </p>
      </div>

      <div>
        <label for="prop-type" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('properties.form.propertyType') }}
        </label>
        <Select
          id="prop-type"
          v-model="form.property_type"
          :options="propertyTypes"
          option-label="label"
          option-value="value"
          class="w-full"
          :invalid="!!fieldErrors.property_type"
          @change="validateField('property_type')"
        />
        <p v-if="fieldErrors.property_type" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.property_type) }}
        </p>
      </div>

      <div>
        <label for="prop-desc" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('properties.form.description') }}
        </label>
        <Textarea
          id="prop-desc"
          v-model="form.description"
          rows="3"
          class="w-full"
          :invalid="!!fieldErrors.description"
          @blur="validateField('description')"
        />
        <p v-if="fieldErrors.description" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.description) }}
        </p>
      </div>

      <div>
        <label for="prop-branch" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('properties.form.branch') }}
        </label>
        <Select
          id="prop-branch"
          v-model="form.branch_id"
          :options="branches"
          option-label="name"
          option-value="id"
          :loading="branchesLoading"
          :disabled="branchesError !== null"
          show-clear
          class="w-full"
        />
        <p v-if="branchesError" class="mt-1 text-xs text-surface-500 dark:text-surface-400">
          {{ branchesError }}
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
          @click="$router.push('/properties')"
        />
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { usePropertiesStore } from '../stores/properties'
import * as propertiesApi from '../api/properties'
import * as branchesApi from '../api/branches'
import { propertySchema, PROPERTY_TYPES, validate } from '../schemas/property'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = usePropertiesStore()
const toast = useToast()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const formError = ref(null)
const fieldErrors = ref({})

const form = ref({
  name: '',
  address: '',
  property_type: '',
  description: '',
  branch_id: null,
})

const branches = ref([])
const branchesLoading = ref(false)
const branchesError = ref(null)

const propertyTypes = computed(() =>
  PROPERTY_TYPES.map((value) => ({
    value,
    label: t(`properties.types.${value}`),
  })),
)

function validateField(field) {
  const { errors } = validate(propertySchema, form.value)
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] || '' }
}

async function loadBranches() {
  branchesLoading.value = true
  branchesError.value = null
  try {
    branches.value = await branchesApi.list()
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    branchesError.value = t('properties.form.branchLoadError')
    branches.value = []
  } finally {
    branchesLoading.value = false
  }
}

async function loadProperty() {
  if (!isEdit.value) return
  try {
    const property = await propertiesApi.get(route.params.id)
    form.value = {
      name: property.name,
      address: property.address,
      property_type: property.property_type,
      description: property.description || '',
      branch_id: property.branch_id,
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('properties.messages.loadError')
  }
}

async function handleSubmit() {
  const { valid, errors } = validate(propertySchema, form.value)
  fieldErrors.value = errors
  if (!valid) return

  submitting.value = true
  formError.value = null
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), form.value)
      toast.add({ severity: 'success', summary: t('properties.messages.updated'), life: 3000 })
    } else {
      await store.create(form.value)
      toast.add({ severity: 'success', summary: t('properties.messages.created'), life: 3000 })
    }
    router.push('/properties')
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadBranches()
  loadProperty()
})

defineExpose({
  form, formError, fieldErrors, submitting, isEdit, branches, branchesLoading, branchesError,
  propertyTypes, validateField, handleSubmit, loadBranches, loadProperty,
})
</script>
