<template>
  <v-container>
    <h1 class="text-h4 mb-4">{{ isEdit ? $t('properties.editTitle') : $t('properties.createTitle') }}</h1>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <v-form ref="formRef" @submit.prevent="handleSubmit" :disabled="submitting">
      <v-text-field
        v-model="form.name"
        :label="$t('properties.form.name')"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-text-field
        v-model="form.address"
        :label="$t('properties.form.address')"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-select
        v-model="form.property_type"
        :label="$t('properties.form.propertyType')"
        :items="propertyTypes"
        item-title="label"
        item-value="value"
        :rules="[rules.required]"
        class="mb-2"
      />
      <v-textarea
        v-model="form.description"
        :label="$t('properties.form.description')"
        :rules="[rules.maxLength5000]"
        rows="3"
        class="mb-2"
      />
      <v-select
        v-model="form.branch_id"
        :label="$t('properties.form.branch')"
        :items="branches"
        item-title="name"
        item-value="id"
        clearable
        :loading="branchesLoading"
        :disabled="branchesError !== null"
        :hint="branchesError ? $t('properties.form.branchLoadError') : ''"
        persistent-hint
        class="mb-4"
      />

      <div class="d-flex ga-2">
        <v-btn type="submit" color="primary" :loading="submitting">
          {{ isEdit ? $t('common.save') : $t('common.create') }}
        </v-btn>
        <v-btn variant="text" :to="'/properties'">{{ $t('common.cancel') }}</v-btn>
      </div>
    </v-form>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { usePropertiesStore } from '../stores/properties'
import * as propertiesApi from '../api/properties'
import * as branchesApi from '../api/branches'

const { t } = useI18n()
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

const propertyTypes = computed(() => [
  { label: t('properties.types.apartment'), value: 'apartment' },
  { label: t('properties.types.hotel'), value: 'hotel' },
  { label: t('properties.types.house'), value: 'house' },
  { label: t('properties.types.hostel'), value: 'hostel' },
])

const rules = {
  required: (v) => !!v || t('common.validation.required'),
  maxLength5000: (v) => !v || v.length <= 5000 || t('common.validation.maxLength5000'),
}

async function loadBranches() {
  branchesLoading.value = true
  branchesError.value = null
  try {
    branches.value = await branchesApi.list()
  } catch (e) { console.error(e);
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
  } catch (e) { console.error(e);
    formError.value = t('properties.messages.loadError')
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
      snackbarText.value = t('properties.messages.updated')
    } else {
      await store.create(form.value)
      snackbarText.value = t('properties.messages.created')
    }
    snackbar.value = true
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

defineExpose({ form, formError, handleSubmit, isEdit, branches, branchesLoading, branchesError, rules, submitting, loadProperty, loadBranches })
</script>
