<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5 font-weight-bold">{{ $t('reservations.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="'/reservations/new'">{{ $t('reservations.addButton') }}</v-btn>
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
        <v-chip :color="statusColor(item.status)" size="small" variant="flat" label>
          {{ statusLabel(item.status) }}
        </v-chip>
      </template>
      <template v-slot:item.total_price_cents="{ item }">
        {{ formatPrice(item.total_price_cents) }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn v-if="item.status === 'confirmed'" size="x-small" color="primary" variant="tonal" class="mr-1" @click="doCheckIn(item)">Check-in</v-btn>
        <v-btn v-if="item.status === 'checked_in'" size="x-small" color="secondary" variant="tonal" class="mr-1" @click="doCheckOut(item)">Check-out</v-btn>
        <v-btn v-if="item.status === 'confirmed' || item.status === 'checked_in'" size="x-small" color="error" variant="text" class="mr-1" @click="doCancel(item)">{{ $t('common.cancel') }}</v-btn>
        <v-btn icon="mdi-pencil" variant="text" size="small" :to="`/reservations/${item.id}/edit`" />
        <v-btn icon="mdi-delete" variant="text" size="small" @click="confirmDelete(item)" />
      </template>
    </v-data-table>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-calendar-blank-outline"
      :title="$t('reservations.emptyState.title')"
      :text="$t('reservations.emptyState.text')"
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="'/reservations/new'">{{ $t('reservations.addButton') }}</v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('reservations.dialog.deleteTitle') }}</v-card-title>
        <v-card-text>{{ $t('reservations.dialog.deleteText') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()
const store = useReservationsStore()
const authStore = useAuthStore()

const headers = computed(() => [
  { title: t('reservations.columns.unit'), key: 'unit_name' },
  { title: t('reservations.columns.guest'), key: 'guest_name' },
  { title: t('reservations.columns.checkIn'), key: 'check_in' },
  { title: t('reservations.columns.checkOut'), key: 'check_out' },
  { title: t('reservations.columns.status'), key: 'status' },
  { title: t('reservations.columns.price'), key: 'total_price_cents' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

const statusColors = { confirmed: 'status-confirmed', checked_in: 'status-checked-in', checked_out: 'status-checked-out', cancelled: 'status-cancelled' }
const statusKeyMap = { confirmed: 'confirmed', checked_in: 'checkedIn', checked_out: 'checkedOut', cancelled: 'cancelled' }

function statusColor(s) { return statusColors[s] || 'grey' }
function statusLabel(s) { return t(`reservations.statuses.${statusKeyMap[s] || s}`) }
function formatPrice(cents) { return cents > 0 ? formatMoney(cents, authStore.organization?.currency || 'RUB') : '—' }

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
    showSnack(t('reservations.messages.deleted'))
  } catch (e) { console.error(e); showSnack(store.error || t('common.messages.error'), 'error') }
  finally { deleteDialog.value = false; deletingItem.value = null }
}

async function doCheckIn(item) {
  try { await store.checkIn(item.id); showSnack(t('reservations.messages.checkInDone')) }
  catch { showSnack(store.error || t('common.messages.error'), 'error') }
}

async function doCheckOut(item) {
  try { await store.checkOut(item.id); showSnack(t('reservations.messages.checkOutDone')) }
  catch { showSnack(store.error || t('common.messages.error'), 'error') }
}

async function doCancel(item) {
  try { await store.cancelReservation(item.id); showSnack(t('reservations.messages.cancelled')) }
  catch { showSnack(store.error || t('common.messages.error'), 'error') }
}

onMounted(() => store.fetchAll())

defineExpose({ headers, statusColor, statusLabel, formatPrice, confirmDelete, handleDelete, doCheckIn, doCheckOut, doCancel })
</script>
