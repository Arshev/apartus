<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('owners.title') }}
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
      <Column field="name" :header="$t('owners.columns.name')" />
      <Column field="email" :header="$t('owners.columns.email')" />
      <Column field="commission_rate" :header="$t('owners.columns.commission')">
        <template #body="{ data }">
          <span class="tabular-nums">{{ (data.commission_rate / 100).toFixed(1) }}%</span>
        </template>
      </Column>
      <Column field="properties_count" :header="$t('owners.columns.propertiesCount')" />
      <Column :header="''" header-style="width: 220px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1 items-center">
            <RouterLink
              :to="`/owners/${data.id}/statement`"
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline px-2"
            >
              {{ $t('owners.reportButton') }}
            </RouterLink>
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
      v-else-if="!store.loading"
      class="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
    >
      <i class="pi pi-id-card text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h3 class="text-base font-medium text-surface-900 dark:text-surface-100">
        {{ $t('owners.emptyState.title') }}
      </h3>
    </div>

    <Dialog
      v-model:visible="formDialog"
      :header="editing ? $t('owners.editTitle') : $t('owners.createTitle')"
      modal
      :style="{ width: '500px' }"
    >
      <div class="space-y-3">
        <div>
          <label for="o-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('owners.form.name') }}
          </label>
          <InputText
            id="o-name"
            v-model="form.name"
            class="w-full"
            :invalid="!!fieldErrors.name"
          />
          <p v-if="fieldErrors.name" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ $t(fieldErrors.name) }}
          </p>
        </div>
        <div>
          <label for="o-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('owners.form.email') }}
          </label>
          <InputText
            id="o-email"
            v-model="form.email"
            type="email"
            class="w-full"
            :invalid="!!fieldErrors.email"
          />
          <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ $t(fieldErrors.email) }}
          </p>
        </div>
        <div>
          <label for="o-phone" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('owners.form.phone') }}
          </label>
          <InputText id="o-phone" v-model="form.phone" class="w-full" />
        </div>
        <div>
          <label for="o-comm" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('owners.form.commissionPct') }}
          </label>
          <InputText id="o-comm" v-model.number="form.commission_pct" type="number" step="0.1" class="w-full" />
        </div>
        <div>
          <label for="o-notes" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('owners.form.notes') }}
          </label>
          <Textarea id="o-notes" v-model="form.notes" rows="2" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="formDialog = false" />
        <Button
          :label="editing ? $t('common.save') : $t('common.create')"
          :loading="formSubmitting"
          @click="handleSubmit"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useOwnersStore } from '../stores/owners'
import { ownerSchema, validate } from '../schemas/owner'

const { t } = useI18n()
const store = useOwnersStore()
const confirm = useConfirm()
const toast = useToast()

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ name: '', email: '', phone: '', commission_pct: 0, notes: '' })
const fieldErrors = ref({})
const formSubmitting = ref(false)

function openCreate() {
  editing.value = null
  form.value = { name: '', email: '', phone: '', commission_pct: 0, notes: '' }
  fieldErrors.value = {}
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    name: item.name,
    email: item.email || '',
    phone: item.phone || '',
    commission_pct: (item.commission_rate || 0) / 100,
    notes: item.notes || '',
  }
  fieldErrors.value = {}
  formDialog.value = true
}

async function handleSubmit() {
  const payload = {
    name: form.value.name,
    email: form.value.email,
    phone: form.value.phone,
    commission_rate: Math.round((form.value.commission_pct || 0) * 100),
    notes: form.value.notes,
  }
  const { valid, errors } = validate(ownerSchema, payload)
  fieldErrors.value = errors
  if (!valid) return

  formSubmitting.value = true
  try {
    if (editing.value) {
      await store.update(editing.value.id, payload)
      toast.add({ severity: 'success', summary: t('common.messages.updated'), life: 3000 })
    } else {
      await store.create(payload)
      toast.add({ severity: 'success', summary: t('common.messages.created'), life: 3000 })
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

function confirmDelete(item) {
  confirm.require({
    message: t('owners.dialog.deleteText', { name: item.name }),
    header: t('owners.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(item),
  })
}

async function handleDelete(item) {
  try {
    await store.destroy(item.id)
    toast.add({ severity: 'success', summary: t('common.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.error'),
      life: 3000,
    })
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  openCreate, openEdit, handleSubmit, confirmDelete, handleDelete,
  editing, form, fieldErrors, formSubmitting,
})
</script>
