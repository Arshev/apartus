<template>
  <div class="max-w-2xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-display font-medium tracking-tight mb-6 text-surface-950 dark:text-surface-50">
      {{ isEdit ? $t('guests.editTitle') : $t('guests.createTitle') }}
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
        <label for="guest-first" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.firstName') }}
        </label>
        <InputText
          id="guest-first"
          v-model="form.first_name"
          class="w-full"
          :invalid="!!fieldErrors.first_name"
          @blur="validateField('first_name')"
        />
        <p v-if="fieldErrors.first_name" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.first_name) }}
        </p>
      </div>

      <div>
        <label for="guest-last" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.lastName') }}
        </label>
        <InputText
          id="guest-last"
          v-model="form.last_name"
          class="w-full"
          :invalid="!!fieldErrors.last_name"
          @blur="validateField('last_name')"
        />
        <p v-if="fieldErrors.last_name" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.last_name) }}
        </p>
      </div>

      <div>
        <label for="guest-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.email') }}
        </label>
        <InputText
          id="guest-email"
          v-model="form.email"
          type="email"
          class="w-full"
          :invalid="!!fieldErrors.email"
          @blur="validateField('email')"
        />
        <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600 dark:text-red-400">
          {{ $t(fieldErrors.email) }}
        </p>
      </div>

      <div>
        <label for="guest-phone" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.phone') }}
        </label>
        <InputText id="guest-phone" v-model="form.phone" class="w-full" />
      </div>

      <div>
        <label for="guest-notes" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.notes') }}
        </label>
        <Textarea id="guest-notes" v-model="form.notes" rows="3" class="w-full" />
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
          @click="$router.push('/guests')"
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
import { useGuestsStore } from '../stores/guests'
import * as guestsApi from '../api/guests'
import { guestSchema, validate } from '../schemas/guest'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useGuestsStore()
const toast = useToast()

const isEdit = computed(() => !!route.params.id)
const submitting = ref(false)
const formError = ref(null)
const fieldErrors = ref({})

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  notes: '',
})

function validateField(field) {
  const { errors } = validate(guestSchema, form.value)
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] || '' }
}

async function loadGuest() {
  if (!isEdit.value) return
  try {
    const guest = await guestsApi.get(route.params.id)
    form.value = {
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email || '',
      phone: guest.phone || '',
      notes: guest.notes || '',
    }
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('guests.messages.loadError')
  }
}

async function handleSubmit() {
  const { valid, errors } = validate(guestSchema, form.value)
  fieldErrors.value = errors
  if (!valid) return

  submitting.value = true
  formError.value = null
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), form.value)
      toast.add({ severity: 'success', summary: t('guests.messages.updated'), life: 3000 })
    } else {
      await store.create(form.value)
      toast.add({ severity: 'success', summary: t('guests.messages.created'), life: 3000 })
    }
    router.push('/guests')
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

onMounted(() => loadGuest())

defineExpose({ form, formError, fieldErrors, submitting, isEdit, validateField, handleSubmit, loadGuest })
</script>
