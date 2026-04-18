<template>
  <v-container>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5 font-weight-bold">{{ $t('guests.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" :to="'/guests/new'">{{ $t('guests.addButton') }}</v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
      <template v-slot:append>
        <v-btn variant="text" size="small" @click="store.fetchAll()">{{ $t('common.retry') }}</v-btn>
      </template>
    </v-alert>

    <v-data-table
      v-if="store.items.length || store.loading"
      :headers="headers"
      :items="store.items"
      :loading="store.loading"
      density="comfortable"
      hover
      class="list-table"
      @click:row="onRowClick"
    >
      <template v-slot:item.full_name="{ item }">
        <span class="font-weight-medium">{{ item.first_name }} {{ item.last_name }}</span>
      </template>
      <template v-slot:item.email="{ item }">
        <span class="text-medium-emphasis">{{ item.email || '—' }}</span>
      </template>
      <template v-slot:item.phone="{ item }">
        <span class="text-medium-emphasis text-tabular">{{ item.phone || '—' }}</span>
      </template>
      <template v-slot:item.actions="{ item }">
        <div @click.stop>
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
      icon="mdi-account-group-outline"
      :title="$t('guests.emptyState.title')"
      :text="$t('guests.emptyState.text')"
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" :to="'/guests/new'">{{ $t('guests.addButton') }}</v-btn>
      </template>
    </v-empty-state>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('guests.dialog.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('guests.dialog.deleteText', { firstName: deletingGuest?.first_name, lastName: deletingGuest?.last_name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="deleteDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :timeout="3000" color="success">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useGuestsStore } from '../stores/guests'

const { t } = useI18n()
const router = useRouter()
const store = useGuestsStore()

const headers = computed(() => [
  { title: t('guests.columns.name'), key: 'full_name' },
  { title: t('guests.columns.email'), key: 'email' },
  { title: t('guests.columns.phone'), key: 'phone' },
  { title: '', key: 'actions', sortable: false, align: 'end', width: 80 },
])

const deleteDialog = ref(false)
const deletingGuest = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

function onRowClick(_event, { item }) {
  if (!item?.id) return
  router.push(`/guests/${item.id}/edit`)
}

function confirmDelete(guest) {
  deletingGuest.value = guest
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingGuest.value.id)
    snackbarText.value = t('guests.messages.deleted')
    snackbar.value = true
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.deleteError')
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingGuest.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({ confirmDelete, handleDelete, headers, deletingGuest, deleteDialog })
</script>

<style scoped>
.list-table :deep(tbody tr) {
  cursor: pointer;
}

.text-tabular {
  font-variant-numeric: tabular-nums;
}
</style>
