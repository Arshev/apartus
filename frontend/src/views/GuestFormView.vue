<template>
  <v-container>
    <h1 class="text-h4 mb-4">{{ isEdit ? 'Редактировать гостя' : 'Новый гость' }}</h1>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <v-form ref="formRef" @submit.prevent="handleSubmit" :disabled="submitting">
      <v-text-field v-model="form.first_name" label="Имя" :rules="[rules.required]" class="mb-2" />
      <v-text-field v-model="form.last_name" label="Фамилия" :rules="[rules.required]" class="mb-2" />
      <v-text-field v-model="form.email" label="Email" type="email" class="mb-2" />
      <v-text-field v-model="form.phone" label="Телефон" class="mb-2" />
      <v-textarea v-model="form.notes" label="Заметки" rows="3" class="mb-4" />

      <div class="d-flex ga-2">
        <v-btn type="submit" color="primary" :loading="submitting">
          {{ isEdit ? 'Сохранить' : 'Создать' }}
        </v-btn>
        <v-btn variant="text" :to="'/guests'">Отмена</v-btn>
      </div>
    </v-form>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGuestsStore } from '../stores/guests'
import * as guestsApi from '../api/guests'

const route = useRoute()
const router = useRouter()
const store = useGuestsStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const formError = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

const form = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  notes: '',
})

const rules = {
  required: (v) => !!v || 'Обязательное поле',
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
  } catch (e) { console.error(e);
    formError.value = 'Не удалось загрузить гостя'
  }
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  submitting.value = true
  formError.value = null
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), form.value)
      snackbarText.value = 'Гость обновлён'
    } else {
      await store.create(form.value)
      snackbarText.value = 'Гость создан'
    }
    snackbar.value = true
    router.push('/guests')
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || 'Ошибка сохранения'
  } finally {
    submitting.value = false
  }
}

onMounted(() => loadGuest())

defineExpose({ form, formError, handleSubmit, isEdit, rules, submitting, loadGuest })
</script>
