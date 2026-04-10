<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Бронирования</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="'/reservations/new'">Новое бронирование</v-btn>
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
      hover
    >
      <template v-slot:item.status="{ item }">
        <v-chip :color="statusColor(item.status)" size="small" variant="elevated">
          {{ statusLabel(item.status) }}
        </v-chip>
      </template>
      <template v-slot:item.total_price_cents="{ item }">
        {{ formatPrice(item.total_price_cents) }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn v-if="item.status === 'confirmed'" size="x-small" color="green" variant="text" @click="doCheckIn(item)">Check-in</v-btn>
        <v-btn v-if="item.status === 'checked_in'" size="x-small" color="grey" variant="text" @click="doCheckOut(item)">Check-out</v-btn>
        <v-btn v-if="item.status === 'confirmed' || item.status === 'checked_in'" size="x-small" color="error" variant="text" @click="doCancel(item)">Отмена</v-btn>
        <v-btn icon="mdi-pencil" variant="text" size="small" :to="`/reservations/${item.id}/edit`" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-calendar-blank-outline"
      title="Нет бронирований"
      text="Создайте первое бронирование."
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="'/reservations/new'">Новое бронирование</v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Удалить бронирование?</v-card-title>
        <v-card-text>Бронирование будет удалено.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">Отмена</v-btn>
          <v-btn color="error" @click="handleDelete">Удалить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useReservationsStore } from '../stores/reservations'

const store = useReservationsStore()

const headers = [
  { title: 'Юнит', key: 'unit_name' },
  { title: 'Гость', key: 'guest_name' },
  { title: 'Заезд', key: 'check_in' },
  { title: 'Выезд', key: 'check_out' },
  { title: 'Статус', key: 'status' },
  { title: 'Цена', key: 'total_price_cents' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const statusColors = { confirmed: 'blue', checked_in: 'green', checked_out: 'grey', cancelled: 'red' }
const statusLabels = { confirmed: 'Подтверждено', checked_in: 'Заселён', checked_out: 'Выселен', cancelled: 'Отменено' }

function statusColor(s) { return statusColors[s] || 'grey' }
function statusLabel(s) { return statusLabels[s] || s }
function formatPrice(cents) { return cents > 0 ? `${(cents / 100).toFixed(2)} ₽` : '—' }

const deleteDialog = ref(false)
const deletingItem = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnack(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function confirmDelete(item) { deletingItem.value = item; deleteDialog.value = true }

async function handleDelete() {
  try {
    await store.destroy(deletingItem.value.id)
    showSnack('Бронирование удалено')
  } catch { showSnack(store.error || 'Ошибка', 'error') }
  finally { deleteDialog.value = false; deletingItem.value = null }
}

async function doCheckIn(item) {
  try { await store.checkIn(item.id); showSnack('Check-in выполнен') }
  catch { showSnack(store.error || 'Ошибка', 'error') }
}

async function doCheckOut(item) {
  try { await store.checkOut(item.id); showSnack('Check-out выполнен') }
  catch { showSnack(store.error || 'Ошибка', 'error') }
}

async function doCancel(item) {
  try { await store.cancelReservation(item.id); showSnack('Бронирование отменено') }
  catch { showSnack(store.error || 'Ошибка', 'error') }
}

onMounted(() => store.fetchAll())

defineExpose({ headers, statusColor, statusLabel, formatPrice, confirmDelete, handleDelete, doCheckIn, doCheckOut, doCancel })
</script>
