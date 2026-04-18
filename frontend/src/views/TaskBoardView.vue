<template>
  <div class="max-w-7xl mx-auto px-6 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('tasks.title') }}
      </h1>
      <div class="flex-1" />
      <Button :label="$t('tasks.addButton')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div v-if="store.loading" class="h-0.5 bg-primary-500 animate-pulse mb-4" />
    <div
      v-if="store.error"
      class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
    >
      <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
      <span>{{ store.error }}</span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        v-for="col in columns"
        :key="col.status"
        class="rounded-lg border border-surface-200 dark:border-surface-700"
      >
        <div class="flex items-center px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <span
            class="inline-block w-2.5 h-2.5 rounded-full mr-2"
            :class="`col-dot--${col.status}`"
          />
          <span class="font-semibold text-surface-900 dark:text-surface-100">{{ col.title }}</span>
          <span
            class="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-full"
            :class="`col-chip--${col.status}`"
          >
            {{ col.items.length }}
          </span>
        </div>
        <div class="p-2">
          <div
            v-for="task in col.items"
            :key="task.id"
            class="task-card mb-2 rounded-md bg-surface-50 dark:bg-surface-900"
            :class="`border-priority-${task.priority}`"
          >
            <div class="px-3 pt-3 pb-1">
              <div class="text-sm font-medium text-surface-900 dark:text-surface-100 mb-1">
                {{ task.title }}
              </div>
              <div class="flex flex-wrap items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400">
                <span v-if="task.due_date" class="inline-flex items-center gap-1">
                  <i class="pi pi-calendar text-[10px]" aria-hidden="true" />{{ task.due_date }}
                </span>
                <span v-if="task.assigned_to_name" class="inline-flex items-center gap-1">
                  <i class="pi pi-user text-[10px]" aria-hidden="true" />{{ task.assigned_to_name }}
                </span>
              </div>
            </div>
            <div class="flex items-center px-3 pb-2 gap-1">
              <span
                class="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded text-white"
                :class="`priority-chip--${task.priority}`"
              >
                {{ priorityLabel(task.priority) }}
              </span>
              <div class="flex-1" />
              <button
                v-if="task.status !== 'completed'"
                type="button"
                class="text-xs px-2 py-1 rounded-md bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/60"
                @click="moveForward(task)"
              >
                {{ task.status === 'pending' ? $t('tasks.moveToWork') : $t('tasks.complete') }}
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-surface-100 dark:hover:bg-surface-800"
                :title="$t('common.edit')"
                @click="openEdit(task)"
              >
                <i class="pi pi-pencil text-xs" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-flex items-center justify-center w-7 h-7 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                :title="$t('common.delete')"
                @click="confirmDelete(task)"
              >
                <i class="pi pi-trash text-xs" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div v-if="!col.items.length" class="text-surface-500 dark:text-surface-400 text-xs text-center py-6">
            {{ $t('tasks.emptyColumn') }}
          </div>
        </div>
      </div>
    </div>

    <Dialog
      v-model:visible="formDialog"
      :header="editing ? $t('tasks.editTitle') : $t('tasks.createTitle')"
      modal
      :style="{ width: '500px' }"
    >
      <div class="space-y-3">
        <div>
          <label for="t-title" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('tasks.form.title') }}
          </label>
          <InputText id="t-title" v-model="form.title" class="w-full" />
        </div>
        <div>
          <label for="t-priority" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('tasks.form.priority') }}
          </label>
          <Select id="t-priority" v-model="form.priority" :options="priorities" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label for="t-cat" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('tasks.form.category') }}
          </label>
          <Select id="t-cat" v-model="form.category" :options="categories" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label for="t-due" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('tasks.form.dueDate') }}
          </label>
          <InputText id="t-due" v-model="form.due_date" type="date" class="w-full" />
        </div>
        <div>
          <label for="t-desc" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('tasks.form.description') }}
          </label>
          <Textarea id="t-desc" v-model="form.description" rows="2" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="formDialog = false" />
        <Button :label="editing ? $t('common.save') : $t('common.add')" :loading="formSubmitting" @click="handleSubmit" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { useTasksStore } from '../stores/tasks'

const { t } = useI18n()
const store = useTasksStore()
const confirm = useConfirm()
const toast = useToast()

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

const formDialog = ref(false)
const editing = ref(null)
const form = ref({ title: '', priority: 'medium', category: 'other', due_date: '', description: '' })
const formSubmitting = ref(false)

function openCreate() {
  editing.value = null
  form.value = { title: '', priority: 'medium', category: 'other', due_date: '', description: '' }
  formDialog.value = true
}

function openEdit(task) {
  editing.value = task
  form.value = {
    title: task.title, priority: task.priority, category: task.category,
    due_date: task.due_date || '', description: task.description || '',
  }
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
    toast.add({ severity: 'success', summary: t('common.messages.saved'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  } finally {
    formSubmitting.value = false
  }
}

async function moveForward(task) {
  const next = task.status === 'pending' ? 'in_progress' : 'completed'
  try {
    await store.update(task.id, { status: next })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
  }
}

function confirmDelete(task) {
  confirm.require({
    message: t('tasks.dialog.deleteTitle'),
    header: t('tasks.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(task),
  })
}

async function handleDelete(task) {
  try {
    await store.destroy(task.id)
    toast.add({ severity: 'success', summary: t('common.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: store.error || t('common.messages.error'), life: 3000 })
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
}

.border-priority-low    { border-left-color: var(--color-priority-low); }
.border-priority-medium { border-left-color: var(--color-priority-medium); }
.border-priority-high   { border-left-color: var(--color-priority-high); }
.border-priority-urgent { border-left-color: var(--color-priority-urgent); }

/* Column dots */
.col-dot--pending { background: var(--color-priority-high); }
.col-dot--in_progress { background: var(--color-priority-medium); }
.col-dot--completed { background: var(--color-finance-revenue); }

.col-chip--pending { background: color-mix(in oklch, var(--color-priority-high) 18%, transparent); color: var(--color-priority-high); }
.col-chip--in_progress { background: color-mix(in oklch, var(--color-priority-medium) 18%, transparent); color: var(--color-priority-medium); }
.col-chip--completed { background: color-mix(in oklch, var(--color-finance-revenue) 18%, transparent); color: var(--color-finance-revenue); }

/* Priority chip backgrounds */
.priority-chip--low { background: var(--color-priority-low); }
.priority-chip--medium { background: var(--color-priority-medium); }
.priority-chip--high { background: var(--color-priority-high); }
.priority-chip--urgent { background: var(--color-priority-urgent); }
</style>
