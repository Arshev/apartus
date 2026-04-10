<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <v-btn variant="text" icon="mdi-arrow-left" :to="`/properties/${propertyId}/units`" />
      <h1 class="text-h4 ml-2">{{ isEdit ? 'Редактировать помещение' : 'Новое помещение' }}</h1>
    </div>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <v-form ref="formRef" @submit.prevent="handleSubmit" :disabled="submitting">
      <v-text-field
        v-model="form.name"
        label="Название"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-select
        v-model="form.unit_type"
        label="Тип помещения"
        :items="unitTypes"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-text-field
        v-model.number="form.capacity"
        label="Вместимость"
        type="number"
        :rules="[rules.required, rules.capacityRange]"
        class="mb-2"
      />
      <v-select
        v-model="form.status"
        label="Статус"
        :items="statuses"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        class="mb-4"
      />

      <div class="d-flex ga-2">
        <v-btn type="submit" color="primary" :loading="submitting">
          {{ isEdit ? 'Сохранить' : 'Создать' }}
        </v-btn>
        <v-btn variant="text" :to="`/properties/${propertyId}/units`">Отмена</v-btn>
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
import { useUnitsStore } from '../stores/units'
import * as unitsApi from '../api/units'

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

const form = ref({
  name: '',
  unit_type: '',
  capacity: null,
  status: 'available',
})

const unitTypes = [
  { label: 'Комната', value: 'room' },
  { label: 'Квартира', value: 'apartment' },
  { label: 'Место', value: 'bed' },
  { label: 'Студия', value: 'studio' },
]

const statuses = [
  { label: 'Доступен', value: 'available' },
  { label: 'Обслуживание', value: 'maintenance' },
  { label: 'Заблокирован', value: 'blocked' },
]

const rules = {
  required: (v) => (v !== '' && v !== null && v !== undefined) || 'Обязательное поле',
  capacityRange: (v) => (Number(v) >= 1 && Number(v) <= 100) || 'От 1 до 100',
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
    }
  } catch {
    formError.value = 'Не удалось загрузить помещение'
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
      snackbarText.value = 'Помещение обновлено'
    } else {
      if (!store.propertyId || store.propertyId !== propertyId.value) {
        store.propertyId = propertyId.value
      }
      await store.create(form.value)
      snackbarText.value = 'Помещение создано'
    }
    snackbar.value = true
    router.push(`/properties/${propertyId.value}/units`)
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || 'Ошибка сохранения'
  } finally {
    submitting.value = false
  }
}

onMounted(() => loadUnit())

defineExpose({ form, formError, handleSubmit, isEdit, rules, submitting, loadUnit, propertyId })
</script>
