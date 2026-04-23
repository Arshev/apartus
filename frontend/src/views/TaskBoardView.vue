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
        <!-- Flattened: no wrapping card. Editorial section header + task list. -->
        <section class="taskboard__column">
          <header class="taskboard__column-head">
            <h2 class="taskboard__column-title">{{ col.title }}</h2>
            <v-chip
              v-if="col.items.length"
              size="x-small"
              variant="tonal"
              density="comfortable"
              class="taskboard__column-count"
            >
              {{ col.items.length }}
            </v-chip>
          </header>

          <div v-if="col.items.length" class="taskboard__cards">
            <v-card
              v-for="task in col.items"
              :key="task.id"
              variant="outlined"
              rounded="md"
              class="taskboard__card"
              @click="openEdit(task)"
            >
              <v-card-text class="px-3 pt-3 pb-1">
                <div class="taskboard__card-title">{{ task.title }}</div>
                <div class="taskboard__card-meta">
                  <span
                    v-if="task.due_date"
                    class="taskboard__card-due"
                    :class="`is-${dueUrgency(task.due_date)}`"
                  >
                    <v-icon size="12" class="mr-1">mdi-calendar-outline</v-icon>
                    {{ relativeDate(task.due_date) }}
                  </span>
                  <span v-if="task.assigned_to_name" class="taskboard__card-assignee">
                    <v-icon size="12" class="mr-1">mdi-account-outline</v-icon>
                    {{ task.assigned_to_name }}
                  </span>
                </div>
              </v-card-text>
              <div class="taskboard__card-footer" @click.stop>
                <v-chip
                  size="x-small"
                  variant="tonal"
                  density="comfortable"
                  :color="priorityColor(task.priority)"
                  class="taskboard__priority-chip"
                >
                  <span
                    class="taskboard__priority-dot"
                    :style="{ background: `rgb(var(--v-theme-${priorityColor(task.priority)}))` }"
                  />
                  {{ priorityLabel(task.priority) }}
                </v-chip>
                <v-spacer />
                <v-btn
                  v-if="task.status !== 'completed'"
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click="moveForward(task)"
                >
                  {{ task.status === 'pending' ? $t('tasks.moveToWork') : $t('tasks.complete') }}
                </v-btn>
                <v-btn
                  size="x-small"
                  icon="mdi-delete-outline"
                  variant="text"
                  color="error"
                  :aria-label="$t('common.delete')"
                  @click="confirmDelete(task)"
                />
              </div>
            </v-card>
          </div>

          <div v-else class="taskboard__empty">
            <v-icon size="20" color="medium-emphasis" icon="mdi-check-circle-outline" />
            <span class="text-medium-emphasis">{{ $t('tasks.emptyColumn') }}</span>
          </div>
        </section>
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
          <v-btn color="error" variant="flat" @click="handleDelete">{{ $t('common.delete') }}</v-btn>
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
import { useRelativeDate } from '../composables/useRelativeDate'
import { parseIsoDate, startOfDay } from '../utils/date'

const { t } = useI18n()
const store = useTasksStore()
const { relativeDate } = useRelativeDate()

const columns = computed(() => [
  { status: 'pending', title: t('tasks.columns.pending'), items: store.pending },
  { status: 'in_progress', title: t('tasks.columns.inProgress'), items: store.inProgress },
  { status: 'completed', title: t('tasks.columns.completed'), items: store.completed },
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

/**
 * Urgency class for due_date — overdue tasks get a visual warning signal
 * via color (not a side-stripe per Impeccable BAN #1).
 * @returns {'overdue' | 'today' | 'tomorrow' | 'later'}
 */
function dueUrgency(iso) {
  if (!iso) return 'later'
  const d = parseIsoDate(iso)
  const today = startOfDay(new Date())
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  return 'later'
}

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
    snackbarText.value = t('common.messages.saved')
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

async function moveForward(task) {
  const next = task.status === 'pending' ? 'in_progress' : 'completed'
  try {
    await store.update(task.id, { status: next })
  } catch (e) {
    console.error(e)
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
  } catch (e) {
    console.error(e)
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  columns, priorities, categories, priorityColor, priorityLabel, dueUrgency,
  openCreate, openEdit, handleSubmit, moveForward, confirmDelete, handleDelete,
  editing, form, formSubmitting,
})
</script>

<style scoped>
/* ── Column shell (flat — no wrapping card) ──────────────────────────── */
.taskboard__column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.taskboard__column-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.taskboard__column-title {
  flex: 1;
  margin: 0;
  font-family: var(--font-display, inherit);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.taskboard__column-count {
  font-variant-numeric: tabular-nums;
}

/* ── Task cards — outlined, clickable, no decorative side stripe ────── */
.taskboard__cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.taskboard__card {
  cursor: pointer;
  transition: border-color 0.12s ease-out, background-color 0.12s ease-out;
}

.taskboard__card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.22);
  background: rgba(var(--v-theme-primary), 0.03);
}

.taskboard__card-title {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  margin-bottom: 6px;
  color: rgb(var(--v-theme-on-surface));
}

.taskboard__card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
}

.taskboard__card-due,
.taskboard__card-assignee {
  display: inline-flex;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-variant-numeric: tabular-nums;
}

/* Due-date urgency: overdue/today loud, tomorrow medium, later muted. */
.taskboard__card-due.is-overdue {
  color: rgb(var(--v-theme-error));
  font-weight: 600;
}

.taskboard__card-due.is-today {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.taskboard__card-due.is-tomorrow {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 500;
}

/* ── Card footer: priority chip + move/delete actions ──────────────── */
.taskboard__card-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px 8px;
}

/* Tonal priority chip with 6px color-dot indicator — same pattern as
   reservation status chip. Replaces the variant="flat" screaming fill. */
.taskboard__priority-chip :deep(.v-chip__content) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.taskboard__priority-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Empty column state — positive framing, consistent with Dashboard ─ */
.taskboard__empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 8px;
  font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  .taskboard__card { transition: none; }
}
</style>
