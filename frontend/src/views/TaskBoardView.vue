<template>
  <v-container fluid class="pa-6">
    <div class="d-flex align-center mb-6">
      <h1 class="text-h5 font-weight-bold">{{ $t('tasks.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">{{ $t('tasks.addButton') }}</v-btn>
    </div>

    <v-progress-linear v-if="store.loading" indeterminate color="primary" class="mb-4" />
    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ store.error }}
    </v-alert>

    <v-row>
      <v-col v-for="col in columns" :key="col.status" cols="12" md="4">
        <v-card variant="outlined">
          <div class="d-flex align-center px-4 py-3">
            <v-icon size="12" :color="col.color" class="mr-2">mdi-circle</v-icon>
            <span class="text-body-1 font-weight-bold">{{ col.title }}</span>
            <v-chip size="x-small" class="ml-2" :color="col.color" variant="tonal">{{ col.items.length }}</v-chip>
          </div>
          <v-divider />
          <div class="pa-2">
            <v-card
              v-for="task in col.items"
              :key="task.id"
              class="mb-2 task-card"
              :class="`border-priority-${task.priority}`"
              variant="flat"
            >
              <v-card-text class="pa-3 pb-1">
                <div class="text-body-2 font-weight-medium mb-1">{{ task.title }}</div>
                <div class="d-flex flex-wrap align-center" style="gap:6px">
                  <span v-if="task.due_date" class="d-flex align-center text-caption text-medium-emphasis">
                    <v-icon size="12" class="mr-1">mdi-calendar-outline</v-icon>{{ task.due_date }}
                  </span>
                  <span v-if="task.assigned_to_name" class="d-flex align-center text-caption text-medium-emphasis">
                    <v-icon size="12" class="mr-1">mdi-account-outline</v-icon>{{ task.assigned_to_name }}
                  </span>
                </div>
              </v-card-text>
              <div class="d-flex align-center px-3 pb-2" style="gap:4px">
                <v-chip size="x-small" :color="priorityColor(task.priority)" variant="flat" label>
                  {{ priorityLabel(task.priority) }}
                </v-chip>
                <v-spacer />
                <v-btn
                  v-if="task.status !== 'completed'"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  @click="moveForward(task)"
                >
                  {{ task.status === 'pending' ? $t('tasks.moveToWork') : $t('tasks.complete') }}
                </v-btn>
                <v-btn size="x-small" icon="mdi-pencil" variant="text" @click="openEdit(task)" />
                <v-btn size="x-small" icon="mdi-delete" variant="text" color="error" @click="confirmDelete(task)" />
              </div>
            </v-card>
            <div v-if="!col.items.length" class="text-medium-emphasis text-caption text-center pa-6">{{ $t('tasks.emptyColumn') }}</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? $t('tasks.editTitle') : $t('tasks.createTitle') }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" :label="$t('tasks.form.title')" class="mb-2" />
          <v-select v-model="form.priority" :label="$t('tasks.form.priority')" :items="priorities" item-title="label" item-value="value" class="mb-2" />
          <v-select v-model="form.category" :label="$t('tasks.form.category')" :items="categories" item-title="label" item-value="value" class="mb-2" />
          <v-text-field v-model="form.due_date" :label="$t('tasks.form.dueDate')" type="date" class="mb-2" />
          <v-textarea v-model="form.description" :label="$t('tasks.form.description')" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleSubmit">{{ editing ? $t('common.save') : $t('common.add') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('tasks.dialog.deleteTitle') }}</v-card-title>
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
import { useTasksStore } from '../stores/tasks'

const { t } = useI18n()
const store = useTasksStore()

const columns = computed(() => [
  { status: 'pending', title: t('tasks.columns.pending'), color: 'warning', items: store.pending },
  { status: 'in_progress', title: t('tasks.columns.inProgress'), color: 'info', items: store.inProgress },
  { status: 'completed', title: t('tasks.columns.completed'), color: 'success', items: store.completed },
])

const priorities = computed(() => [
  { label: t('tasks.priorities.low'), value: 'low' },
  { label: t('tasks.priorities.medium'), value: 'medium' },
  { label: t('tasks.priorities.high'), value: 'high' },
  { label: t('tasks.priorities.urgent'), value: 'urgent' },
])
const categories = computed(() => [
  { label: t('tasks.categories.cleaning'), value: 'cleaning' },
  { label: t('tasks.categories.maintenance'), value: 'maintenance' },
  { label: t('tasks.categories.inspection'), value: 'inspection' },
  { label: t('tasks.categories.other'), value: 'other' },
])

const priorityColors = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high', urgent: 'priority-urgent' }
function priorityColor(p) { return priorityColors[p] || 'grey' }
function priorityLabel(p) { return priorities.value.find((pr) => pr.value === p)?.label || p }

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ title: '', priority: 'medium', category: 'other', due_date: '', description: '' })
const formSubmitting = ref(false)
const deleteDialog = ref(false)
const deleting = ref(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function openCreate() {
  editing.value = null
  form.value = { title: '', priority: 'medium', category: 'other', due_date: '', description: '' }
  formDialog.value = true
}

function openEdit(task) {
  editing.value = task
  form.value = { title: task.title, priority: task.priority, category: task.category, due_date: task.due_date || '', description: task.description || '' }
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
    snackbarText.value = t(editing.value ? 'common.messages.saved' : 'common.messages.saved')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) { console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    formSubmitting.value = false
  }
}

async function moveForward(task) {
  const next = task.status === 'pending' ? 'in_progress' : 'completed'
  try {
    await store.update(task.id, { status: next })
  } catch (e) { console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

function confirmDelete(task) { deleting.value = task; deleteDialog.value = true }

async function handleDelete() {
  try {
    await store.destroy(deleting.value.id)
    snackbarText.value = t('common.messages.deleted')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) { console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  columns, priorities, categories, priorityColor, priorityLabel,
  openCreate, openEdit, handleSubmit, moveForward, confirmDelete, handleDelete,
  editing, form, formSubmitting,
})
</script>

<style scoped>
.task-card {
  border-left: 3px solid transparent;
  background: rgb(var(--v-theme-surface-light));
}
.border-priority-low    { border-left-color: rgb(var(--v-theme-priority-low)); }
.border-priority-medium { border-left-color: rgb(var(--v-theme-priority-medium)); }
.border-priority-high   { border-left-color: rgb(var(--v-theme-priority-high)); }
.border-priority-urgent { border-left-color: rgb(var(--v-theme-priority-urgent)); }
</style>
