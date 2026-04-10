<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Каналы продаж</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Добавить канал</v-btn>
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
        {{ platformLabels[item.platform] || item.platform }}
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

    <v-empty-state v-else-if="!store.loading" icon="mdi-swap-horizontal" title="Нет каналов" text="Подключите Booking.com, Airbnb или другие площадки через iCal." />

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? 'Редактировать канал' : 'Новый канал' }}</v-card-title>
        <v-card-text>
          <v-select v-if="!editing" v-model="form.unit_id" label="Юнит" :items="units" item-title="label" item-value="id" class="mb-2" />
          <v-select v-model="form.platform" label="Площадка" :items="platforms" item-title="label" item-value="value" class="mb-2" />
          <v-text-field v-model="form.ical_import_url" label="iCal Import URL (от площадки)" class="mb-2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">Отмена</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">{{ editing ? 'Сохранить' : 'Создать' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить канал?</v-card-title>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Отмена</v-btn>
          <v-btn color="error" @click="handleDelete">Удалить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">{{ snackbarText }}</v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useChannelsStore } from '../stores/channels'
import * as allUnitsApi from '../api/allUnits'

const store = useChannelsStore()

const headers = [
  { title: 'Юнит', key: 'unit_name' },
  { title: 'Объект', key: 'property_name' },
  { title: 'Площадка', key: 'platform' },
  { title: 'iCal Export', key: 'ical_export_url' },
  { title: 'Последняя синхр.', key: 'last_synced_at' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const platformLabels = { booking_com: 'Booking.com', airbnb: 'Airbnb', ostrovok: 'Островок', other: 'Другое' }
const platforms = Object.entries(platformLabels).map(([value, label]) => ({ value, label }))

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
  snackbarText.value = 'URL скопирован'
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
    snackbarText.value = editing.value ? 'Обновлено' : 'Канал создан'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || 'Ошибка'
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
    snackbarText.value = 'Канал удалён'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || 'Ошибка'
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

async function doSync(item) {
  try {
    await store.syncChannel(item.id)
    snackbarText.value = 'Синхронизация запущена'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || 'Ошибка'
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
  headers, platformLabels, platforms, units,
  openCreate, openEdit, handleSubmit, confirmDelete, handleDelete, doSync, copyUrl,
  editing, form, formSubmitting,
})
</script>
