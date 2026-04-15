<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ $t('channels.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ $t('channels.addButton') }}</v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
    </v-alert>

    <v-data-table
      v-if="store.items.length || store.loading"
      :headers="headers"
      :items="store.items"
      :loading="store.loading"
      density="comfortable"
    >
      <template v-slot:item.platform="{ item }">
        {{ platformLabel(item.platform) }}
      </template>
      <template v-slot:item.ical_export_url="{ item }">
        <code class="text-caption">{{ item.ical_export_url }}</code>
        <v-btn icon="mdi-content-copy" variant="text" size="x-small" @click="copyUrl(item.ical_export_url)" />
      </template>
      <template v-slot:item.last_synced_at="{ item }">
        {{ item.last_synced_at || '—' }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn size="x-small" variant="text" color="primary" @click="doSync(item)" :disabled="!item.ical_import_url">Sync</v-btn>
        <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEdit(item)" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state v-else-if="!store.loading" icon="mdi-swap-horizontal" :title="$t('channels.emptyState.title')" :text="$t('channels.emptyState.text')" />

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? $t('channels.editTitle') : $t('channels.createTitle') }}</v-card-title>
        <v-card-text>
          <v-select v-if="!editing" v-model="form.unit_id" :label="$t('channels.form.unit')" :items="units" item-title="label" item-value="id" class="mb-2" />
          <v-select v-model="form.platform" :label="$t('channels.form.platform')" :items="platforms" item-title="label" item-value="value" class="mb-2" />
          <v-text-field v-model="form.ical_import_url" :label="$t('channels.form.icalImportUrl')" class="mb-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">{{ editing ? $t('common.save') : $t('common.create') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('channels.dialog.deleteTitle') }}</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChannelsStore } from '../stores/channels'
import * as allUnitsApi from '../api/allUnits'

const { t } = useI18n()
const store = useChannelsStore()

const headers = computed(() => [
  { title: t('channels.columns.unit'), key: 'unit_name' },
  { title: t('channels.columns.property'), key: 'property_name' },
  { title: t('channels.columns.platform'), key: 'platform' },
  { title: t('channels.columns.icalExport'), key: 'ical_export_url' },
  { title: t('channels.columns.lastSynced'), key: 'last_synced_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

const platformKeyMap = { booking_com: 'bookingCom', airbnb: 'airbnb', ostrovok: 'ostrovok', other: 'other' }

function platformLabel(platform) {
  const key = platformKeyMap[platform]
  return key ? t(`channels.platforms.${key}`) : platform
}

const platforms = computed(() =>
  Object.entries(platformKeyMap).map(([value, key]) => ({ value, label: t(`channels.platforms.${key}`) }))
)

const units = ref([])
const formDialog = ref(false)
const editing = ref(null)
const form = ref({ unit_id: null, platform: 'booking_com', ical_import_url: '' })
const formSubmitting = ref(false)
const deleteDialog = ref(false)
const deleting = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function copyUrl(url) {
  const full = `${window.location.origin}${url}`
  navigator.clipboard.writeText(full)
  snackbarText.value = t('channels.messages.urlCopied')
  snackbarColor.value = 'success'
  snackbar.value = true
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
    snackbarText.value = editing.value ? t('common.messages.updated') : t('channels.messages.created')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(item) { deleting.value = item; deleteDialog.value = true }

async function handleDelete() {
  try {
    await store.destroy(deleting.value.id)
    snackbarText.value = t('channels.messages.deleted')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

async function doSync(item) {
  try {
    await store.syncChannel(item.id)
    snackbarText.value = t('channels.messages.syncStarted')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

async function loadUnits() {
  try {
    const list = await allUnitsApi.list()
    units.value = list.map((u) => ({ id: u.id, label: `${u.property_name} → ${u.name}` }))
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  store.fetchAll()
  loadUnits()
})

defineExpose({
  headers, platforms, units, platformLabel,
  openCreate, openEdit, handleSubmit, confirmDelete, handleDelete, doSync, copyUrl,
  editing, form, formSubmitting,
})
</script>
