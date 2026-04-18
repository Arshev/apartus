<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('amenities.title') }}
      </h1>
      <div class="flex-1" />
      <Button :label="$t('common.add')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div
      v-if="store.error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span class="flex-1">
        {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      </span>
    </div>

    <DataTable
      v-if="store.items.length || store.loading"
      :value="store.items"
      :loading="store.loading"
      size="small"
      striped-rows
      data-key="id"
      class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
    >
      <Column field="name" :header="$t('amenities.columns.name')" />
      <Column :header="''" header-style="width: 120px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1">
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              :title="$t('common.edit')"
              @click="openEdit(data)"
            >
              <i class="pi pi-pencil text-sm" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              :title="$t('common.delete')"
              @click="confirmDelete(data)"
            >
              <i class="pi pi-trash text-sm" aria-hidden="true" />
            </button>
          </div>
        </template>
      </Column>
    </DataTable>

    <div
      v-else-if="!store.loading && !store.error"
      class="text-center py-16 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
    >
      <i class="pi pi-star text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('amenities.emptyState.title') }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('amenities.emptyState.text') }}
      </p>
      <Button :label="$t('common.add')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <!-- Create/Edit dialog -->
    <Dialog
      v-model:visible="formDialog"
      :header="editingAmenity ? $t('amenities.editTitle') : $t('amenities.createTitle')"
      modal
      :style="{ width: '400px' }"
    >
      <div class="space-y-2">
        <label for="amenity-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
          {{ $t('amenities.form.name') }}
        </label>
        <InputText
          id="amenity-name"
          v-model="formName"
          class="w-full"
          autofocus
          :invalid="!!formError"
          @keyup.enter="handleFormSubmit"
        />
        <p v-if="formError" class="text-xs text-red-600 dark:text-red-400">
          {{ $t(formError) }}
        </p>
      </div>
      <template #footer>
        <Button
          :label="$t('common.cancel')"
          severity="secondary"
          variant="text"
          @click="formDialog = false"
        />
        <Button
          :label="editingAmenity ? $t('common.save') : $t('common.create')"
          :loading="formSubmitting"
          @click="handleFormSubmit"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useAmenitiesStore } from '../stores/amenities'

const { t } = useI18n()
const store = useAmenitiesStore()
const confirm = useConfirm()
const toast = useToast()

const formDialog = ref(false)
const editingAmenity = ref(null)
const formName = ref('')
const formError = ref('')
const formSubmitting = ref(false)

function openCreate() {
  editingAmenity.value = null
  formName.value = ''
  formError.value = ''
  formDialog.value = true
}

function openEdit(amenity) {
  editingAmenity.value = amenity
  formName.value = amenity.name
  formError.value = ''
  formDialog.value = true
}

async function handleFormSubmit() {
  const name = formName.value.trim()
  if (!name) {
    formError.value = 'common.validation.required'
    return
  }
  formError.value = ''
  formSubmitting.value = true
  try {
    if (editingAmenity.value) {
      await store.update(editingAmenity.value.id, { name })
      toast.add({ severity: 'success', summary: t('amenities.messages.updated'), life: 3000 })
    } else {
      await store.create({ name })
      toast.add({ severity: 'success', summary: t('amenities.messages.created'), life: 3000 })
    }
    formDialog.value = false
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.error'),
      life: 3000,
    })
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(amenity) {
  confirm.require({
    message: t('amenities.dialog.deleteText', { name: amenity.name }),
    header: t('amenities.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(amenity),
  })
}

async function handleDelete(amenity) {
  try {
    await store.destroy(amenity.id)
    toast.add({ severity: 'success', summary: t('amenities.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.deleteError'),
      life: 3000,
    })
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  openCreate, openEdit, handleFormSubmit, confirmDelete, handleDelete,
  formDialog, editingAmenity, formName, formError, formSubmitting,
})
</script>
