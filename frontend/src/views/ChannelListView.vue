<template>
  <div class="max-w-6xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('channels.title') }}
      </h1>
      <div class="flex-1" />
      <Button :label="$t('channels.addButton')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div
      v-if="store.error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span>{{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}</span>
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
      <Column field="unit_name" :header="$t('channels.columns.unit')" />
      <Column field="property_name" :header="$t('channels.columns.property')" />
      <Column field="platform" :header="$t('channels.columns.platform')">
        <template #body="{ data }">{{ platformLabel(data.platform) }}</template>
      </Column>
      <Column field="ical_export_url" :header="$t('channels.columns.icalExport')">
        <template #body="{ data }">
          <div class="flex items-center gap-1">
            <code class="text-xs text-surface-600 dark:text-surface-400 truncate max-w-[200px]">
              {{ data.ical_export_url }}
            </code>
            <button
              type="button"
              class="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-surface-100 dark:hover:bg-surface-800"
              :title="$t('channels.messages.urlCopied')"
              @click="copyUrl(data.ical_export_url)"
            >
              <i class="pi pi-copy text-xs" aria-hidden="true" />
            </button>
          </div>
        </template>
      </Column>
      <Column field="last_synced_at" :header="$t('channels.columns.lastSynced')">
        <template #body="{ data }">{{ data.last_synced_at || '—' }}</template>
      </Column>
      <Column :header="''" header-style="width: 220px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1">
            <button
              type="button"
              class="text-xs px-2 py-1 rounded-md text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/40 disabled:opacity-40"
              :disabled="!data.ical_import_url"
              @click="doSync(data)"
            >
              Sync
            </button>
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
      <i class="pi pi-arrows-h text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h3 class="text-base font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('channels.emptyState.title') }}
      </h3>
      <p class="text-sm text-surface-600 dark:text-surface-400">{{ $t('channels.emptyState.text') }}</p>
    </div>

    <Dialog
      v-model:visible="formDialog"
      :header="editing ? $t('channels.editTitle') : $t('channels.createTitle')"
      modal
      :style="{ width: '500px' }"
    >
      <div class="space-y-3">
        <div v-if="!editing">
          <label for="ch-unit" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('channels.form.unit') }}
          </label>
          <Select id="ch-unit" v-model="form.unit_id" :options="units" option-label="label" option-value="id" class="w-full" filter />
        </div>
        <div>
          <label for="ch-platform" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('channels.form.platform') }}
          </label>
          <Select id="ch-platform" v-model="form.platform" :options="platforms" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label for="ch-ical" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('channels.form.icalImportUrl') }}
          </label>
          <InputText id="ch-ical" v-model="form.ical_import_url" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="formDialog = false" />
        <Button :label="editing ? $t('common.save') : $t('common.create')" :loading="formSubmitting" @click="handleSubmit" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useChannelsStore } from '../stores/channels'
import * as allUnitsApi from '../api/allUnits'

const { t } = useI18n()
const store = useChannelsStore()
const confirm = useConfirm()
const toast = useToast()

const platformKeyMap = { booking_com: 'bookingCom', airbnb: 'airbnb', ostrovok: 'ostrovok', other: 'other' }

function platformLabel(platform) {
  const key = platformKeyMap[platform]
  return key ? t(`channels.platforms.${key}`) : platform
}

const platforms = computed(() =>
  Object.entries(platformKeyMap).map(([value, key]) => ({ value, label: t(`channels.platforms.${key}`) })),
)

const units = ref([])
const formDialog = ref(false)
const editing = ref(null)
const form = ref({ unit_id: null, platform: 'booking_com', ical_import_url: '' })
const formSubmitting = ref(false)

function copyUrl(url) {
  const full = `${window.location.origin}${url}`
  navigator.clipboard.writeText(full)
  toast.add({ severity: 'success', summary: t('channels.messages.urlCopied'), life: 3000 })
}

function openCreate() {
  editing.value = null
  form.value = { unit_id: null, platform: 'booking_com', ical_import_url: '' }
  formDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = { platform: item.platform, ical_import_url: item.ical_import_url || '' }
  formDialog.value = true
}

async function handleSubmit() {
  formSubmitting.value = true
  try {
    if (editing.value) {
      await store.update(editing.value.id, form.value)
    } else {
      await store.create(form.value)
    }
    formDialog.value = false
    toast.add({
      severity: 'success',
      summary: editing.value ? t('common.messages.updated') : t('channels.messages.created'),
      life: 3000,
    })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(item) {
  confirm.require({
    message: t('channels.dialog.deleteTitle'),
    header: t('channels.dialog.deleteTitle'),
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
    toast.add({ severity: 'success', summary: t('channels.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

async function doSync(item) {
  try {
    await store.syncChannel(item.id)
    toast.add({ severity: 'success', summary: t('channels.messages.syncStarted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

async function loadUnits() {
  try {
    const list = await allUnitsApi.list()
    units.value = list.map((u) => ({ id: u.id, label: `${u.property_name} → ${u.name}` }))
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
  }
}

onMounted(() => {
  store.fetchAll()
  loadUnits()
})

defineExpose({
  platforms, units, platformLabel,
  openCreate, openEdit, handleSubmit, confirmDelete, handleDelete, doSync, copyUrl,
  editing, form, formSubmitting,
})
</script>
