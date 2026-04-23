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
      class="reservations-table"
      @click:row="onRowClick"
    >
      <!-- Guest + Unit stacked: name prominent, unit muted subline. -->
      <template v-slot:item.guest_name="{ item }">
        <div class="reservations-table__guest">
          <div class="reservations-table__guest-name">
            {{ item.guest_name || $t('common.blocking') }}
          </div>
          <div class="reservations-table__unit text-medium-emphasis">
            {{ item.unit_name }}
          </div>
        </div>
      </template>

      <!-- Date columns: humanized relative label + ISO subline. -->
      <template v-slot:item.check_in="{ item }">
        <div class="reservations-table__date">
          <span :class="['reservations-table__date-rel', `is-${urgency(item.check_in)}`]">
            {{ relativeDate(item.check_in) }}
          </span>
          <span v-if="urgency(item.check_in) !== 'later'" class="reservations-table__date-iso text-tabular text-medium-emphasis">
            {{ formatIso(item.check_in) }}
          </span>
        </div>
      </template>

      <template v-slot:item.check_out="{ item }">
        <div class="reservations-table__date">
          <span :class="['reservations-table__date-rel', `is-${urgency(item.check_out)}`]">
            {{ relativeDate(item.check_out) }}
          </span>
          <span v-if="urgency(item.check_out) !== 'later'" class="reservations-table__date-iso text-tabular text-medium-emphasis">
            {{ formatIso(item.check_out) }}
          </span>
        </div>
      </template>

      <!-- Tonal chip with dot indicator — quietly modern, not screaming. -->
      <template v-slot:item.status="{ item }">
        <v-chip
          :color="statusColor(item.status)"
          size="small"
          variant="tonal"
          density="comfortable"
          class="reservations-table__chip"
        >
          <span class="reservations-table__chip-dot" :style="{ background: `rgb(var(--v-theme-${statusColor(item.status)}))` }" />
          {{ statusLabel(item.status) }}
        </v-chip>
      </template>

      <template v-slot:item.total_price_cents="{ item }">
        <span class="reservations-table__price text-tabular">{{ formatPrice(item.total_price_cents) }}</span>
      </template>

      <template v-slot:item.actions="{ item }">
        <div class="reservations-table__actions" @click.stop>
          <v-btn
            v-if="item.status === 'confirmed'"
            size="small"
            variant="text"
            color="primary"
            @click="doCheckIn(item)"
          >
            {{ $t('reservations.actions.checkIn') }}
          </v-btn>
          <v-btn
            v-if="item.status === 'checked_in'"
            size="small"
            variant="text"
            color="on-surface"
            @click="doCheckOut(item)"
          >
            {{ $t('reservations.actions.checkOut') }}
          </v-btn>
          <v-btn
            v-if="item.status === 'confirmed' || item.status === 'checked_in'"
            size="small"
            variant="text"
            color="error"
            @click="doCancel(item)"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            color="error"
            :aria-label="$t('common.delete')"
            @click="confirmDelete(item)"
          />
        </div>
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

    <!-- Single dialog reused for delete / cancel / check-out confirms. -->
    <v-dialog v-model="confirmDialog.open" max-width="440">
      <v-card>
        <v-card-title>{{ confirmDialog.title }}</v-card-title>
        <v-card-text>{{ confirmDialog.text }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmDialog.open = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn :color="confirmDialog.acceptColor" variant="flat" @click="runConfirm">{{ confirmDialog.acceptLabel }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" :color="snackbarColor">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import { formatMoney } from '../utils/currency'
import { useRelativeDate } from '../composables/useRelativeDate'
import { parseIsoDate, formatShortDate } from '../utils/date'

const { t, locale } = useI18n()
const router = useRouter()
const store = useReservationsStore()
const authStore = useAuthStore()
const { urgency, relativeDate } = useRelativeDate()

const headers = computed(() => [
  { title: t('reservations.columns.guest'), key: 'guest_name' },
  { title: t('reservations.columns.checkIn'), key: 'check_in' },
  { title: t('reservations.columns.checkOut'), key: 'check_out' },
  { title: t('reservations.columns.status'), key: 'status' },
  { title: t('reservations.columns.price'), key: 'total_price_cents', align: 'end' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 320 },
])

const statusColors = { confirmed: 'status-confirmed', checked_in: 'status-checked-in', checked_out: 'status-checked-out', cancelled: 'status-cancelled' }
const statusKeyMap = { confirmed: 'confirmed', checked_in: 'checkedIn', checked_out: 'checkedOut', cancelled: 'cancelled' }

function statusColor(s) { return statusColors[s] || 'grey' }
function statusLabel(s) { return t(`reservations.statuses.${statusKeyMap[s] || s}`) }
function formatPrice(cents) { return cents > 0 ? formatMoney(cents, authStore.organization?.currency || 'RUB') : '—' }

/** Short ISO date for the subline under today/tomorrow labels. */
function formatIso(iso) {
  if (!iso) return ''
  return formatShortDate(parseIsoDate(iso), locale.value)
}

/** Row click → edit. Action buttons + icon stop propagation in their wrapper. */
function onRowClick(_event, { item }) {
  if (!item?.id) return
  router.push(`/reservations/${item.id}/edit`)
}

// Unified confirm dialog state — delete / cancel / check-out route through it.
const confirmDialog = reactive({
  open: false,
  title: '',
  text: '',
  acceptLabel: '',
  acceptColor: 'primary',
  onAccept: () => {},
})

function runConfirm() {
  const handler = confirmDialog.onAccept
  confirmDialog.open = false
  handler()
}

function itemDescriptor(item) {
  const guest = item.guest_name || t('common.blocking')
  const ci = formatIso(item.check_in)
  const co = formatIso(item.check_out)
  const dates = ci && co ? `${ci} — ${co}` : ci || co || '—'
  return { guest, dates }
}

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showSnack(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function confirmDelete(item) {
  confirmDialog.title = t('reservations.dialog.deleteTitle')
  confirmDialog.text = t('reservations.dialog.deleteText')
  confirmDialog.acceptLabel = t('common.delete')
  confirmDialog.acceptColor = 'error'
  confirmDialog.onAccept = () => handleDelete(item)
  confirmDialog.open = true
}

async function handleDelete(item) {
  try {
    await store.destroy(item.id)
    showSnack(t('reservations.messages.deleted'))
  } catch (e) {
    console.error(e)
    showSnack(store.error || t('common.messages.error'), 'error')
  }
}

async function doCheckIn(item) {
  try { await store.checkIn(item.id); showSnack(t('reservations.messages.checkInDone')) }
  catch { showSnack(store.error || t('common.messages.error'), 'error') }
}

// Check-out is reversible via edit → soft confirm. Cancel is irreversible → hard confirm.
function doCheckOut(item) {
  const { guest, dates } = itemDescriptor(item)
  confirmDialog.title = t('reservations.confirm.checkOutTitle')
  confirmDialog.text = t('reservations.confirm.checkOutText', { guest, dates })
  confirmDialog.acceptLabel = t('reservations.actions.checkOut')
  confirmDialog.acceptColor = 'primary'
  confirmDialog.onAccept = async () => {
    try { await store.checkOut(item.id); showSnack(t('reservations.messages.checkOutDone')) }
    catch { showSnack(store.error || t('common.messages.error'), 'error') }
  }
  confirmDialog.open = true
}

function doCancel(item) {
  const { guest, dates } = itemDescriptor(item)
  confirmDialog.title = t('reservations.confirm.cancelTitle')
  confirmDialog.text = t('reservations.confirm.cancelText', { guest, dates })
  confirmDialog.acceptLabel = t('reservations.confirm.cancelAccept')
  confirmDialog.acceptColor = 'error'
  confirmDialog.onAccept = async () => {
    try { await store.cancelReservation(item.id); showSnack(t('reservations.messages.cancelled')) }
    catch { showSnack(store.error || t('common.messages.error'), 'error') }
  }
  confirmDialog.open = true
}

onMounted(() => store.fetchAll())

defineExpose({
  headers, statusColor, statusLabel, formatPrice,
  confirmDelete, handleDelete, doCheckIn, doCheckOut, doCancel,
  confirmDialog, runConfirm,
})
</script>

<style scoped>
/* Stacked guest + unit cell — 2-line layout like Dashboard upcoming. */
.reservations-table__guest {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.reservations-table__guest-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reservations-table__unit {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Date cell: relative label top + ISO subline (today/tomorrow only). */
.reservations-table__date {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.reservations-table__date-rel {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  font-variant-numeric: tabular-nums;
}

.reservations-table__date-rel.is-today {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}

.reservations-table__date-rel.is-tomorrow {
  font-weight: 600;
}

.reservations-table__date-rel.is-past {
  font-weight: 400;
  opacity: 0.7;
}

.reservations-table__date-iso {
  font-size: 11px;
}

/* Status chip — tonal variant + left dot indicator. */
.reservations-table__chip :deep(.v-chip__content) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reservations-table__chip-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Price right-aligned, tabular. */
.reservations-table__price {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

/* Actions column: compact gap, no gaps in hit-targets. */
.reservations-table__actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
}

/* v-data-table 'hover' prop sets row bg on hover; make it match editorial tint. */
.reservations-table :deep(tbody tr) {
  cursor: pointer;
}
</style>
