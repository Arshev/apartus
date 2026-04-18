<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="guest-quick-create__title">
        {{ $t('guests.quickCreate.title') }}
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="formError"
          type="error"
          class="mb-3"
          density="compact"
          closable
          @click:close="formError = null"
        >
          {{ formError }}
        </v-alert>
        <v-text-field
          v-model="form.first_name"
          :label="$t('guests.form.firstName')"
          :rules="[rules.required]"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="form.last_name"
          :label="$t('guests.form.lastName')"
          :rules="[rules.required]"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="form.email"
          :label="$t('guests.form.email')"
          type="email"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="form.phone"
          :label="$t('guests.form.phone')"
          density="compact"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn color="primary" :loading="submitting" @click="handleSubmit">
          {{ $t('common.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as guestsApi from '../api/guests'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])

const { t } = useI18n()
const submitting = ref(false)
const formError = ref(null)
const form = ref({ first_name: '', last_name: '', email: '', phone: '' })

const rules = {
  required: (v) => !!v || t('common.validation.required'),
}

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

<style scoped>
.guest-quick-create__title {
  font-family: var(--font-display, inherit);
  font-size: 1.125rem;
  font-weight: 500;
}
</style>
