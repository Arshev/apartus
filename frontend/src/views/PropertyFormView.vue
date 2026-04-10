<template>
  <v-container>
    <h1 class="text-h4 mb-4">{{ isEdit ? 'Редактировать объект' : 'Новый объект' }}</h1>

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
      <v-text-field
        v-model="form.address"
        label="Адрес"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-select
        v-model="form.property_type"
        label="Тип объекта"
        :items="propertyTypes"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-textarea
        v-model="form.description"
        label="Описание"
        :rules="[rules.maxLength5000]"
        rows="3"
        class="mb-2"
      />
      <v-select
        v-model="form.branch_id"
        label="Филиал"
        :items="branches"
        item-title="name"
        item-value="id"
        clearable
        :loading="branchesLoading"
        :disabled="branchesError !== null"
        :hint="branchesError ? 'Не удалось загрузить филиалы' : ''"
        persistent-hint
        class="mb-4"
      />

      <div class="d-flex ga-2">
        <v-btn type="submit" color="primary" :loading="submitting">
          {{ isEdit ? 'Сохранить' : 'Создать' }}
        </v-btn>
        <v-btn variant="text" :to="'/properties'">Отмена</v-btn>
      </div>
    </v-form>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePropertiesStore } from '../stores/properties'
import * as propertiesApi from '../api/properties'
import * as branchesApi from '../api/branches'

const route = useRoute()
const router = useRouter()
const store = usePropertiesStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const formError = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

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

const propertyTypes = [
  { label: 'Квартира', value: 'apartment' },
  { label: 'Отель', value: 'hotel' },
  { label: 'Дом', value: 'house' },
  { label: 'Хостел', value: 'hostel' },
]

const rules = {
  required: (v) => !!v || 'Обязательное поле',
  maxLength5000: (v) => !v || v.length <= 5000 || 'Максимум 5000 символов',
}

async function loadBranches() {
  branchesLoading.value = true
  branchesError.value = null
  try {
    branches.value = await branchesApi.list()
  } catch (e) { console.error(e);
    branchesError.value = 'Не удалось загрузить филиалы'
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
  } catch (e) { console.error(e);
    formError.value = 'Не удалось загрузить объект'
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
      snackbarText.value = 'Объект обновлён'
    } else {
      await store.create(form.value)
      snackbarText.value = 'Объект создан'
    }
    snackbar.value = true
    router.push('/properties')
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || 'Ошибка сохранения'
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadBranches()
  loadProperty()
})

defineExpose({ form, formError, handleSubmit, isEdit, branches, branchesLoading, branchesError, rules, submitting, loadProperty, loadBranches })
</script>
