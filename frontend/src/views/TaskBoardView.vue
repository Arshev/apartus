<template>
  <v-container fluid>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">Задачи</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Новая задача</v-btn>
    </div>

    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />
    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ store.error }}
    </v-alert>

    <v-row>
      <v-col v-for="col in columns" :key="col.status" cols="12" md="4">
        <v-card variant="outlined">
          <v-card-title class="text-subtitle-1">{{ col.title }} ({{ col.items.length }})</v-card-title>
          <v-card-text>
            <v-card
              v-for="task in col.items"
              :key="task.id"
              class="mb-2"
              variant="tonal"
              :color="priorityColor(task.priority)"
            >
              <v-card-title class="text-body-1">{{ task.title }}</v-card-title>
              <v-card-subtitle>
                <v-chip size="x-small" :color="priorityColor(task.priority)">{{ priorityLabel(task.priority) }}</v-chip>
                <span v-if="task.due_date" class="ml-2 text-caption">{{ task.due_date }}</span>
                <span v-if="task.assigned_to_name" class="ml-2 text-caption">→ {{ task.assigned_to_name }}</span>
              </v-card-subtitle>
              <v-card-actions>
                <v-btn v-if="task.status !== 'completed'" size="x-small" variant="text"
                  @click="moveForward(task)">{{ task.status === 'pending' ? 'В работу' : 'Завершить' }}</v-btn>
                <v-btn size="x-small" variant="text" @click="openEdit(task)">Изменить</v-btn>
                <v-btn size="x-small" variant="text" color="error" @click="confirmDelete(task)">Удалить</v-btn>
              </v-card-actions>
            </v-card>
            <div v-if="!col.items.length" class="text-medium-emphasis text-center pa-4">Пусто</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="formDialog" max-width="500">
      <v-card>
        <v-card-title>{{ editing ? 'Редактировать' : 'Новая задача' }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="Название" class="mb-2" />
          <v-select v-model="form.priority" label="Приоритет" :items="priorities" item-title="label" item-value="value" class="mb-2" />
          <v-select v-model="form.category" label="Категория" :items="categories" item-title="label" item-value="value" class="mb-2" />
          <v-text-field v-model="form.due_date" label="Срок" type="date" class="mb-2" />
          <v-textarea v-model="form.description" label="Описание" rows="2" />
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
        <v-card-title>Удалить задачу?</v-card-title>
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
import { ref, computed, onMounted } from 'vue'
import { useTasksStore } from '../stores/tasks'

const store = useTasksStore()

const columns = computed(() => [
  { status: 'pending', title: 'Ожидает', items: store.pending },
  { status: 'in_progress', title: 'В работе', items: store.inProgress },
  { status: 'completed', title: 'Завершено', items: store.completed },
])

const priorities = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
  { label: 'Срочный', value: 'urgent' },
]
const categories = [
  { label: 'Уборка', value: 'cleaning' },
  { label: 'Обслуживание', value: 'maintenance' },
  { label: 'Инспекция', value: 'inspection' },
  { label: 'Прочее', value: 'other' },
]

const priorityColors = { low: 'grey', medium: 'blue', high: 'orange', urgent: 'red' }
function priorityColor(p) { return priorityColors[p] || 'grey' }
function priorityLabel(p) { return priorities.find((pr) => pr.value === p)?.label || p }

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
    snackbarText.value = editing.value ? 'Обновлено' : 'Создано'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || 'Ошибка'
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
  } catch (e) { console.error(e);
    snackbarText.value = store.error || 'Ошибка'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

function confirmDelete(task) { deleting.value = task; deleteDialog.value = true }

async function handleDelete() {
  try {
    await store.destroy(deleting.value.id)
    snackbarText.value = 'Удалено'
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || 'Ошибка'
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
