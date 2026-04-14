<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ $t('guests.title') }}</h1>
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
    >
      <template v-slot:item.full_name="{ item }">
        {{ item.first_name }} {{ item.last_name }}
      </template>
      <template v-slot:item.actions="{ item }">
        <v-btn icon="mdi-pencil" variant="text" size="small" :to="`/guests/${item.id}/edit`" />
        <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDelete(item)" />
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
          <v-btn color="error" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
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
import { useGuestsStore } from '../stores/guests'

const { t } = useI18n()
const store = useGuestsStore()

const headers = computed(() => [
  { title: t('guests.columns.name'), key: 'full_name' },
  { title: t('guests.columns.email'), key: 'email' },
  { title: t('guests.columns.phone'), key: 'phone' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

const deleteDialog = ref(false)
const deletingGuest = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')

function confirmDelete(guest) {
  deletingGuest.value = guest
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingGuest.value.id)
    snackbarText.value = t('guests.messages.deleted')
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || t('common.messages.deleteError')
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingGuest.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({ confirmDelete, handleDelete, headers })
</script>
