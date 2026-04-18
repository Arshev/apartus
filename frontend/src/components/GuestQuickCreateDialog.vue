<template>
  <Dialog
    :visible="modelValue"
    :header="$t('guests.quickCreate.title')"
    modal
    :style="{ width: '480px' }"
    @update:visible="$emit('update:modelValue', $event)"
  >
    <div class="space-y-3">
      <div
        v-if="formError"
        class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200"
      >
        <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
        <span class="flex-1">{{ formError }}</span>
        <button type="button" :aria-label="$t('common.close')" class="text-red-500 hover:text-red-700" @click="formError = null">
          <i class="pi pi-times" />
        </button>
      </div>
      <div>
        <label for="gqc-first" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.firstName') }}
        </label>
        <InputText id="gqc-first" v-model="form.first_name" class="w-full" size="small" />
      </div>
      <div>
        <label for="gqc-last" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.lastName') }}
        </label>
        <InputText id="gqc-last" v-model="form.last_name" class="w-full" size="small" />
      </div>
      <div>
        <label for="gqc-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.email') }}
        </label>
        <InputText id="gqc-email" v-model="form.email" type="email" class="w-full" size="small" />
      </div>
      <div>
        <label for="gqc-phone" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('guests.form.phone') }}
        </label>
        <InputText id="gqc-phone" v-model="form.phone" class="w-full" size="small" />
      </div>
    </div>
    <template #footer>
      <Button
        :label="$t('common.cancel')"
        severity="secondary"
        variant="text"
        @click="$emit('update:modelValue', false)"
      />
      <Button
        :label="$t('common.create')"
        :loading="submitting"
        @click="handleSubmit"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import * as guestsApi from '../api/guests'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])

const { t } = useI18n()
const submitting = ref(false)
const formError = ref(null)
const form = ref({ first_name: '', last_name: '', email: '', phone: '' })

function resetForm() {
  form.value = { first_name: '', last_name: '', email: '', phone: '' }
  formError.value = null
}

watch(
  () => props.modelValue,
  (opened) => {
    if (opened) resetForm()
  },
)

async function handleSubmit() {
  if (!form.value.first_name || !form.value.last_name) {
    formError.value = t('common.validation.required')
    return
  }
  submitting.value = true
  formError.value = null
  try {
    const guest = await guestsApi.create({ ...form.value })
    emit('created', guest)
    emit('update:modelValue', false)
  } catch (e) {
    formError.value = e?.response?.data?.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

defineExpose({ form, formError, submitting, handleSubmit })
</script>
