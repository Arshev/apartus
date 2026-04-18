<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <div class="flex items-center mb-6">
      <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
        {{ $t('branches.title') }}
      </h1>
      <div class="flex-1" />
      <Button :label="$t('common.add')" icon="pi pi-plus" @click="openCreate(null)" />
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

    <div
      v-if="store.tree.length || store.loading"
      class="border border-surface-200 dark:border-surface-700 rounded-lg p-3"
    >
      <ProgressBar v-if="store.loading" mode="indeterminate" style="height: 4px" class="mb-3" />
      <BranchNode
        v-for="node in store.tree"
        :key="node.id"
        :node="node"
        :depth="0"
        @edit="openEdit"
        @delete="confirmDelete"
        @add-child="openCreate"
      />
    </div>

    <div
      v-else-if="!store.loading && !store.error"
      class="text-center py-16 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
    >
      <i class="pi pi-sitemap text-4xl text-surface-400 mb-3" aria-hidden="true" />
      <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100 mb-1">
        {{ $t('branches.emptyState.title') }}
      </h2>
      <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
        {{ $t('branches.emptyState.text') }}
      </p>
      <Button :label="$t('common.add')" icon="pi pi-plus" @click="openCreate(null)" />
    </div>

    <!-- Create/Edit dialog -->
    <Dialog
      v-model:visible="formDialog"
      :header="editingBranch ? $t('branches.editTitle') : $t('branches.createTitle')"
      modal
      :style="{ width: '400px' }"
    >
      <div class="space-y-3">
        <div>
          <label for="branch-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('branches.form.name') }}
          </label>
          <InputText
            id="branch-name"
            v-model="formName"
            class="w-full"
            autofocus
            :invalid="!!formError"
            @keyup.enter="handleFormSubmit"
          />
          <p v-if="formError" class="mt-1 text-xs text-red-600 dark:text-red-400">
            {{ $t(formError) }}
          </p>
        </div>
        <div>
          <label for="branch-parent" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
            {{ $t('branches.form.parentBranch') }}
          </label>
          <Select
            id="branch-parent"
            v-model="formParentId"
            :options="parentOptions"
            option-label="name"
            option-value="id"
            show-clear
            class="w-full"
          />
        </div>
      </div>
      <template #footer>
        <Button
          :label="$t('common.cancel')"
          severity="secondary"
          variant="text"
          @click="formDialog = false"
        />
        <Button
          :label="editingBranch ? $t('common.save') : $t('common.create')"
          :loading="formSubmitting"
          @click="handleFormSubmit"
        />
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
import Select from 'primevue/select'
import ProgressBar from 'primevue/progressbar'
import { useBranchesStore } from '../stores/branches'
import BranchNode from './BranchNode.vue'

const { t } = useI18n()
const store = useBranchesStore()
const confirm = useConfirm()
const toast = useToast()

const formDialog = ref(false)
const editingBranch = ref(null)
const formName = ref('')
const formParentId = ref(null)
const formError = ref('')
const formSubmitting = ref(false)

const parentOptions = computed(() => {
  const exclude = editingBranch.value?.id
  return store.items.filter((b) => b.id !== exclude)
})

function openCreate(parentId) {
  editingBranch.value = null
  formName.value = ''
  formParentId.value = parentId
  formError.value = ''
  formDialog.value = true
}

function openEdit(branch) {
  editingBranch.value = branch
  formName.value = branch.name
  formParentId.value = branch.parent_branch_id
  formError.value = ''
  formDialog.value = true
}

async function handleFormSubmit() {
  const name = formName.value.trim()
  if (!name) {
    formError.value = 'common.validation.required'
    return
  }
  formError.value = ''
  formSubmitting.value = true
  try {
    const data = { name, parent_branch_id: formParentId.value || null }
    if (editingBranch.value) {
      await store.update(editingBranch.value.id, data)
      toast.add({ severity: 'success', summary: t('branches.messages.updated'), life: 3000 })
    } else {
      await store.create(data)
      toast.add({ severity: 'success', summary: t('branches.messages.created'), life: 3000 })
    }
    formDialog.value = false
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.error'),
      life: 3000,
    })
  } finally {
    formSubmitting.value = false
  }
}

function confirmDelete(branch) {
  confirm.require({
    message: t('branches.dialog.deleteText', { name: branch.name }),
    header: t('branches.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDelete(branch),
  })
}

async function handleDelete(branch) {
  try {
    await store.destroy(branch.id)
    toast.add({ severity: 'success', summary: t('branches.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({
      severity: 'error',
      summary: store.error || t('common.messages.deleteError'),
      life: 3000,
    })
  }
}

onMounted(() => store.fetchAll())

defineExpose({
  openCreate, openEdit, handleFormSubmit, confirmDelete, handleDelete,
  formDialog, editingBranch, formName, formParentId, formError, formSubmitting,
  parentOptions,
})
</script>
