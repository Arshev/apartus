<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('reservations.title') }}
      </h1>
      <div class="flex-1" />
      <RouterLink
        to="/reservations/new"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('reservations.addButton') }}
      </RouterLink>
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
      <Column field="unit_name" :header="$t('reservations.columns.unit')" />
      <Column field="guest_name" :header="$t('reservations.columns.guest')" />
      <Column field="check_in" :header="$t('reservations.columns.checkIn')" />
      <Column field="check_out" :header="$t('reservations.columns.checkOut')" />
      <Column field="status" :header="$t('reservations.columns.status')">
        <template #body="{ data }">
          <span :class="['status-chip', `status-chip--${data.status}`]">
            {{ statusLabel(data.status) }}
          </span>
        </template>
      </Column>
      <Column field="total_price_cents" :header="$t('reservations.columns.price')">
        <template #body="{ data }">
          <span class="tabular-nums">{{ formatPrice(data.total_price_cents) }}</span>
        </template>
      </Column>
      <Column :header="''" header-style="width: 340px; text-align: right">
        <template #body="{ data }">
          <div class="flex justify-end gap-1 items-center">
            <button
              v-if="data.status === 'confirmed'"
              type="button"
              class="text-xs px-2 py-1 rounded-md bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/60"
              @click="doCheckIn(data)"
            >
              Check-in
            </button>
            <button
              v-if="data.status === 'checked_in'"
              type="button"
              class="text-xs px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
              @click="doCheckOut(data)"
            >
              Check-out
            </button>
            <button
              v-if="data.status === 'confirmed' || data.status === 'checked_in'"
              type="button"
              class="text-xs px-2 py-1 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              @click="doCancel(data)"
            >
              {{ $t('common.cancel') }}
            </button>
            <RouterLink
              :to="`/reservations/${data.id}/edit`"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              :title="$t('common.edit')"
            >
              <i class="pi pi-pencil text-sm" aria-hidden="true" />
            </RouterLink>
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
      <i class="pi pi-calendar text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('reservations.emptyState.title') }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('reservations.emptyState.text') }}
      </p>
      <RouterLink
        to="/reservations/new"
        class="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors text-sm font-medium"
      >
        <i class="pi pi-plus" aria-hidden="true" />
        {{ $t('reservations.addButton') }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import { formatMoney } from '../utils/currency'

const { t } = useI18n()
const store = useReservationsStore()
const authStore = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const statusKeyMap = {
  confirmed: 'confirmed',
  checked_in: 'checkedIn',
  checked_out: 'checkedOut',
  cancelled: 'cancelled',
}

// Legacy shim for tests (was Vuetify `color` name).
const statusColors = {
  confirmed: 'status-confirmed',
  checked_in: 'status-checked-in',
  checked_out: 'status-checked-out',
  cancelled: 'status-cancelled',
}

function statusColor(s) { return statusColors[s] || 'grey' }
function statusLabel(s) { return t(`reservations.statuses.${statusKeyMap[s] || s}`) }

function formatPrice(cents) {
  if (!cents || cents <= 0) return '—'
  return formatMoney(cents, authStore.organization?.currency || 'RUB')
}

function confirmDelete(item) {
  confirm.require({
    message: t('reservations.dialog.deleteText'),
    header: t('reservations.dialog.deleteTitle'),
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
    toast.add({ severity: 'success', summary: t('reservations.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

async function doCheckIn(item) {
  try {
    await store.checkIn(item.id)
    toast.add({ severity: 'success', summary: t('reservations.messages.checkInDone'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

async function doCheckOut(item) {
  try {
    await store.checkOut(item.id)
    toast.add({ severity: 'success', summary: t('reservations.messages.checkOutDone'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

async function doCancel(item) {
  try {
    await store.cancelReservation(item.id)
    toast.add({ severity: 'success', summary: t('reservations.messages.cancelled'), life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

onMounted(() => store.fetchAll())

defineExpose({ statusColor, statusLabel, formatPrice, confirmDelete, handleDelete, doCheckIn, doCheckOut, doCancel })
</script>

<style scoped>
.status-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 4px;
  color: #fff;
}

.status-chip--confirmed { background: var(--color-status-confirmed); }
.status-chip--checked_in { background: var(--color-status-checked-in); }
.status-chip--checked_out { background: var(--color-status-checked-out); }
.status-chip--cancelled { background: var(--color-status-cancelled); }
.status-chip--pending { background: var(--color-status-pending); }
.status-chip--blocked { background: var(--color-status-blocked); }
</style>
