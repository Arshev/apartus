<template>
  <v-container>
    <div class="d-flex align-center mb-4">
      <h1 class="text-h4">{{ $t('branches.title') }}</h1>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate(null)">
        {{ $t('common.add') }}
      </v-btn>
    </div>

    <v-alert v-if="store.error" type="error" class="mb-4" closable @click:close="store.error = null">
      {{ Array.isArray(store.error) ? store.error.join(', ') : store.error }}
    </v-alert>

    <div v-if="store.tree.length || store.loading">
      <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />
      <branch-node
        v-for="node in store.tree"
        :key="node.id"
        :node="node"
        :depth="0"
        @edit="openEdit"
        @delete="confirmDelete"
        @add-child="openCreate"
      />
    </div>

    <v-empty-state
      v-else-if="!store.loading && !store.error"
      icon="mdi-source-branch"
      :title="$t('branches.emptyState.title')"
      :text="$t('branches.emptyState.text')"
    >
      <template v-slot:actions>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate(null)">{{ $t('common.add') }}</v-btn>
      </template>
    </v-empty-state>

    <!-- Create/Edit dialog -->
    <v-dialog v-model="formDialog" max-width="400">
      <v-card>
        <v-card-title>{{ editingBranch ? $t('branches.editTitle') : $t('branches.createTitle') }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="formName" :label="$t('branches.form.name')" :rules="[rules.required]" autofocus class="mb-2" />
          <v-select
            v-model="formParentId"
            :label="$t('branches.form.parentBranch')"
            :items="parentOptions"
            item-title="name"
            item-value="id"
            clearable
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="formDialog = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="primary" :loading="formSubmitting" @click="handleFormSubmit">
            {{ editingBranch ? $t('common.save') : $t('common.create') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>{{ $t('branches.dialog.deleteTitle') }}</v-card-title>
        <v-card-text>
          {{ $t('branches.dialog.deleteText', { name: deletingBranch?.name }) }}
        </v-card-text>
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
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBranchesStore } from '../stores/branches'

const BranchNode = defineAsyncComponent(() => import('./BranchNode.vue'))

const { t } = useI18n()
const store = useBranchesStore()

const rules = { required: (v) => !!v || t('common.validation.required') }

const formDialog = ref(false)
const editingBranch = ref(null)
const formName = ref('')
const formParentId = ref(null)
const formSubmitting = ref(false)

const deleteDialog = ref(false)
const deletingBranch = ref(null)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const parentOptions = computed(() => {
  const exclude = editingBranch.value?.id
  return store.items.filter((b) => b.id !== exclude)
})

function openCreate(parentId) {
  editingBranch.value = null
  formName.value = ''
  formParentId.value = parentId
  formDialog.value = true
}

function openEdit(branch) {
  editingBranch.value = branch
  formName.value = branch.name
  formParentId.value = branch.parent_branch_id
  formDialog.value = true
}

async function handleFormSubmit() {
  if (!formName.value.trim()) return
  formSubmitting.value = true
  try {
    const data = { name: formName.value.trim(), parent_branch_id: formParentId.value || null }
    if (editingBranch.value) {
      await store.update(editingBranch.value.id, data)
      snackbarText.value = t('branches.messages.updated')
    } else {
      await store.create(data)
      snackbarText.value = t('branches.messages.created')
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    formDialog.value = false
  } catch (e) { console.error(e);
    snackbarText.value = store.error || t('common.messages.error')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(branch) {
  deletingBranch.value = branch
  deleteDialog.value = true
}

async function handleDelete() {
  try {
    await store.destroy(deletingBranch.value.id)
    snackbarText.value = t('branches.messages.deleted')
    snackbarColor.value = 'success'
    snackbar.value = true
  } catch (e) { console.error(e);
    snackbarText.value = store.error || t('common.messages.deleteError')
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    deleteDialog.value = false
    deletingBranch.value = null
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  openCreate, openEdit, handleFormSubmit, confirmDelete, handleDelete,
  formDialog, editingBranch, formName, formParentId, formSubmitting,
  deleteDialog, deletingBranch, parentOptions, rules,
})
</script>

<script>
// Register BranchNode as recursive component
import BranchNode from './BranchNode.vue'
export default { components: { BranchNode } }
</script>
