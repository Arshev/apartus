<template>
  <div class="max-w-5xl mx-auto px-4 py-6">
    <h1 class="text-2xl font-display font-medium tracking-tight mb-6 text-surface-950 dark:text-surface-50">
      {{ $t('settings.title') }}
    </h1>

    <Tabs v-model:value="tab">
      <TabList>
        <Tab value="general">{{ $t('settings.tabs.general') }}</Tab>
        <Tab value="integrations">{{ $t('settings.tabs.integrations') }}</Tab>
        <Tab value="members">{{ $t('settings.tabs.members') }}</Tab>
        <Tab value="roles">{{ $t('settings.tabs.roles') }}</Tab>
      </TabList>

      <TabPanels>
        <!-- General -->
        <TabPanel value="general">
          <div
            v-if="orgError"
            class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
          >
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">{{ Array.isArray(orgError) ? orgError.join(', ') : orgError }}</span>
            <button type="button" :aria-label="$t('common.close')" class="text-red-500 hover:text-red-700" @click="orgError = null">
              <i class="pi pi-times" />
            </button>
          </div>

          <form @submit.prevent="handleOrgSave" class="space-y-4 max-w-lg">
            <div>
              <label for="org-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('settings.general.orgName') }}
              </label>
              <InputText id="org-name" v-model="orgForm.name" class="w-full" />
            </div>
            <div>
              <label for="org-currency" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('settings.general.currency') }}
              </label>
              <Select
                id="org-currency"
                v-model="orgForm.currency"
                :options="currencyList"
                option-label="label"
                option-value="code"
                class="w-full"
              />
            </div>
            <div>
              <label for="org-locale" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('settings.general.language') }}
              </label>
              <Select
                id="org-locale"
                v-model="orgForm.locale"
                :options="localeOptions"
                option-label="label"
                option-value="value"
                class="w-full"
              />
            </div>
            <Button type="submit" :label="$t('common.save')" :loading="orgSaving" />
          </form>
        </TabPanel>

        <!-- Integrations -->
        <TabPanel value="integrations">
          <h2 class="text-lg font-display font-medium mb-4 text-surface-900 dark:text-surface-100">
            {{ $t('settings.integrations.telegramTitle') }}
          </h2>

          <div
            v-if="telegramError"
            class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
          >
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">{{ telegramError }}</span>
          </div>
          <div
            v-if="telegramSuccess"
            class="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 px-3 py-2 text-sm text-green-800 dark:text-green-200 mb-4"
          >
            <i class="pi pi-check-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">{{ $t('settings.integrations.testSuccess') }}</span>
          </div>

          <div class="space-y-4 max-w-lg">
            <div>
              <label for="tg-token" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('settings.integrations.botToken') }}
              </label>
              <InputText id="tg-token" v-model="telegramForm.bot_token" class="w-full" />
            </div>
            <div>
              <label for="tg-chat" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('settings.integrations.chatId') }}
              </label>
              <InputText id="tg-chat" v-model="telegramForm.chat_id" class="w-full" />
            </div>
            <div class="flex gap-2">
              <Button :label="$t('common.save')" :loading="telegramSaving" @click="saveTelegram" />
              <Button
                :label="$t('settings.integrations.testButton')"
                severity="secondary"
                variant="outlined"
                :loading="telegramTesting"
                :disabled="!telegramForm.bot_token || !telegramForm.chat_id"
                @click="testTelegram"
              />
            </div>
            <div class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-3">
              <p class="text-sm text-surface-600 dark:text-surface-400 whitespace-pre-line">
                {{ $t('settings.integrations.instructions') }}
              </p>
            </div>
          </div>
        </TabPanel>

        <!-- Members -->
        <TabPanel value="members">
          <div class="flex items-center mb-6">
            <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100">
              {{ $t('settings.members.title') }}
            </h2>
            <div class="flex-1" />
            <Button :label="$t('common.add')" icon="pi pi-plus" @click="openAddMember" />
          </div>

          <div
            v-if="membersStore.error"
            class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
          >
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">
              {{ Array.isArray(membersStore.error) ? membersStore.error.join(', ') : membersStore.error }}
            </span>
          </div>

          <DataTable
            v-if="membersStore.items.length || membersStore.loading"
            :value="membersStore.items"
            :loading="membersStore.loading"
            size="small"
            striped-rows
            data-key="id"
            class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
          >
            <Column field="user" :header="$t('settings.members.columns.member')">
              <template #body="{ data }">
                {{ data.user.full_name }} ({{ data.user.email }})
              </template>
            </Column>
            <Column field="role" :header="$t('settings.members.columns.role')">
              <template #body="{ data }">
                {{ roleLabel(data.role) }}{{ data.role_name ? ` — ${data.role_name}` : '' }}
              </template>
            </Column>
            <Column :header="''" header-style="width: 120px; text-align: right">
              <template #body="{ data }">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    :title="$t('common.edit')"
                    @click="openEditMember(data)"
                  >
                    <i class="pi pi-pencil text-sm" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    :title="$t('common.delete')"
                    @click="confirmDeleteMember(data)"
                  >
                    <i class="pi pi-trash text-sm" aria-hidden="true" />
                  </button>
                </div>
              </template>
            </Column>
          </DataTable>
          <div
            v-else-if="!membersStore.loading"
            class="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
          >
            <i class="pi pi-users text-4xl text-surface-400 mb-3" aria-hidden="true" />
            <h3 class="text-base font-medium text-surface-900 dark:text-surface-100">
              {{ $t('settings.members.emptyState.title') }}
            </h3>
          </div>

          <Dialog
            v-model:visible="memberDialog"
            :header="editingMember ? $t('settings.members.editTitle') : $t('settings.members.addTitle')"
            modal
            :style="{ width: '500px' }"
          >
            <div class="space-y-3">
              <template v-if="!editingMember">
                <div>
                  <label for="m-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                    {{ $t('settings.members.form.email') }}
                  </label>
                  <InputText id="m-email" v-model="memberForm.email" type="email" class="w-full" />
                </div>
                <div>
                  <label for="m-first" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                    {{ $t('settings.members.form.firstName') }}
                  </label>
                  <InputText id="m-first" v-model="memberForm.first_name" class="w-full" />
                </div>
                <div>
                  <label for="m-last" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                    {{ $t('settings.members.form.lastName') }}
                  </label>
                  <InputText id="m-last" v-model="memberForm.last_name" class="w-full" />
                </div>
                <div>
                  <label for="m-pwd" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                    {{ $t('settings.members.form.password') }}
                  </label>
                  <InputText id="m-pwd" v-model="memberForm.password" type="password" class="w-full" />
                </div>
              </template>
              <div>
                <label for="m-role" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                  {{ $t('settings.members.form.role') }}
                </label>
                <Select
                  id="m-role"
                  v-model="memberForm.role"
                  :options="roleOptions"
                  option-label="label"
                  option-value="value"
                  class="w-full"
                />
              </div>
            </div>
            <template #footer>
              <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="memberDialog = false" />
              <Button
                :label="editingMember ? $t('common.save') : $t('common.add')"
                :loading="memberSubmitting"
                @click="handleMemberSubmit"
              />
            </template>
          </Dialog>
        </TabPanel>

        <!-- Roles -->
        <TabPanel value="roles">
          <div class="flex items-center mb-6">
            <h2 class="text-lg font-display font-medium text-surface-900 dark:text-surface-100">
              {{ $t('settings.roles.title') }}
            </h2>
            <div class="flex-1" />
            <Button :label="$t('common.add')" icon="pi pi-plus" @click="openAddRole" />
          </div>

          <div
            v-if="rolesStore.error"
            class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200 mb-4"
          >
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">
              {{ Array.isArray(rolesStore.error) ? rolesStore.error.join(', ') : rolesStore.error }}
            </span>
          </div>

          <DataTable
            v-if="rolesStore.items.length || rolesStore.loading"
            :value="rolesStore.items"
            :loading="rolesStore.loading"
            size="small"
            striped-rows
            data-key="id"
            class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
          >
            <Column field="name" :header="$t('settings.roles.columns.name')" />
            <Column field="code" :header="$t('settings.roles.columns.code')" />
            <Column field="is_system" :header="$t('settings.roles.columns.isSystem')">
              <template #body="{ data }">
                {{ data.is_system ? $t('common.yes') : $t('common.no') }}
              </template>
            </Column>
            <Column field="members_count" :header="$t('settings.roles.columns.membersCount')" />
            <Column :header="''" header-style="width: 120px; text-align: right">
              <template #body="{ data }">
                <div class="flex justify-end gap-1">
                  <button
                    type="button"
                    :disabled="data.is_system"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :title="$t('common.edit')"
                    @click="openEditRole(data)"
                  >
                    <i class="pi pi-pencil text-sm" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :disabled="data.is_system"
                    class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    :title="$t('common.delete')"
                    @click="confirmDeleteRole(data)"
                  >
                    <i class="pi pi-trash text-sm" aria-hidden="true" />
                  </button>
                </div>
              </template>
            </Column>
          </DataTable>
          <div
            v-else-if="!rolesStore.loading"
            class="text-center py-12 border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl"
          >
            <i class="pi pi-id-card text-4xl text-surface-400 mb-3" aria-hidden="true" />
            <h3 class="text-base font-medium text-surface-900 dark:text-surface-100">
              {{ $t('settings.roles.emptyState.title') }}
            </h3>
          </div>

          <Dialog
            v-model:visible="roleDialog"
            :header="editingRole ? $t('settings.roles.editTitle') : $t('settings.roles.addTitle')"
            modal
            :style="{ width: '500px' }"
          >
            <div class="space-y-3">
              <div>
                <label for="r-name" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                  {{ $t('settings.roles.form.name') }}
                </label>
                <InputText id="r-name" v-model="roleForm.name" class="w-full" />
              </div>
              <div>
                <label for="r-code" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                  {{ $t('settings.roles.form.code') }}
                </label>
                <InputText id="r-code" v-model="roleForm.code" class="w-full" />
              </div>
            </div>
            <template #footer>
              <Button :label="$t('common.cancel')" severity="secondary" variant="text" @click="roleDialog = false" />
              <Button
                :label="editingRole ? $t('common.save') : $t('common.add')"
                :loading="roleSubmitting"
                @click="handleRoleSubmit"
              />
            </template>
          </Dialog>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import { useAuthStore } from '../stores/auth'
import { useMembersStore } from '../stores/members'
import { useRolesStore } from '../stores/roles'
import * as organizationsApi from '../api/organizations'
import apiClient from '../api/client'
import { CURRENCY_LIST } from '../utils/currency'
import { setAppLocale } from '../plugins/i18n'

const { t } = useI18n()
const authStore = useAuthStore()
const membersStore = useMembersStore()
const rolesStore = useRolesStore()
const confirm = useConfirm()
const toast = useToast()

const tab = ref('general')

// ── General ──
const orgForm = ref({ name: '', currency: 'RUB', locale: 'ru' })
const currencyList = CURRENCY_LIST
const localeOptions = [
  { label: 'Русский', value: 'ru' },
  { label: 'English', value: 'en' },
]
const orgSaving = ref(false)
const orgError = ref(null)
const orgSettings = ref({})

async function loadOrg() {
  if (!authStore.organization?.id) return
  try {
    const org = await organizationsApi.get()
    orgSettings.value = org.settings || {}
    orgForm.value.name = org.name
    orgForm.value.currency = org.currency || 'RUB'
    orgForm.value.locale = orgSettings.value.locale || 'ru'
    telegramForm.value.bot_token = orgSettings.value.telegram_bot_token || ''
    telegramForm.value.chat_id = orgSettings.value.telegram_chat_id || ''
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    orgError.value = t('settings.general.loadError')
  }
}

async function handleOrgSave() {
  orgSaving.value = true
  orgError.value = null
  try {
    const nextSettings = { ...orgSettings.value, locale: orgForm.value.locale }
    const updated = await organizationsApi.update({
      name: orgForm.value.name,
      currency: orgForm.value.currency,
      settings: nextSettings,
    })
    orgSettings.value = updated?.settings || nextSettings
    setAppLocale(orgForm.value.locale)
    toast.add({ severity: 'success', summary: t('common.messages.saved'), life: 3000 })
  } catch (e) {
    orgError.value = e.response?.data?.error || t('common.messages.error')
  } finally {
    orgSaving.value = false
  }
}

// ── Integrations (Telegram) ──
const telegramForm = ref({ bot_token: '', chat_id: '' })
const telegramSaving = ref(false)
const telegramTesting = ref(false)
const telegramError = ref(null)
const telegramSuccess = ref(false)

async function saveTelegram() {
  telegramSaving.value = true
  telegramError.value = null
  try {
    const nextSettings = {
      ...orgSettings.value,
      telegram_bot_token: telegramForm.value.bot_token,
      telegram_chat_id: telegramForm.value.chat_id,
    }
    const updated = await organizationsApi.update({ settings: nextSettings })
    orgSettings.value = updated?.settings || nextSettings
    telegramSuccess.value = false
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    telegramError.value = t('settings.integrations.saveError')
  } finally {
    telegramSaving.value = false
  }
}

async function testTelegram() {
  telegramTesting.value = true
  telegramError.value = null
  telegramSuccess.value = false
  try {
    await saveTelegram()
    await apiClient.post('/organization/test_telegram')
    telegramSuccess.value = true
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    telegramError.value = t('settings.integrations.testError')
  } finally {
    telegramTesting.value = false
  }
}

// ── Members ──
const roleOptions = computed(() => [
  { label: t('settings.members.roles.member'), value: 'member' },
  { label: t('settings.members.roles.manager'), value: 'manager' },
  { label: t('settings.members.roles.owner'), value: 'owner' },
])

function roleLabel(role) {
  return roleOptions.value.find((r) => r.value === role)?.label || role
}

const memberDialog = ref(false)
const editingMember = ref(null)
const memberForm = ref({ email: '', first_name: '', last_name: '', password: '', role: 'member' })
const memberSubmitting = ref(false)

function openAddMember() {
  editingMember.value = null
  memberForm.value = { email: '', first_name: '', last_name: '', password: '', role: 'member' }
  memberDialog.value = true
}

function openEditMember(member) {
  editingMember.value = member
  memberForm.value = { role: member.role }
  memberDialog.value = true
}

async function handleMemberSubmit() {
  memberSubmitting.value = true
  try {
    if (editingMember.value) {
      await membersStore.update(editingMember.value.id, { role_enum: memberForm.value.role })
      toast.add({ severity: 'success', summary: t('settings.members.messages.roleUpdated'), life: 3000 })
    } else {
      await membersStore.create(memberForm.value)
      toast.add({ severity: 'success', summary: t('settings.members.messages.memberAdded'), life: 3000 })
    }
    memberDialog.value = false
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: membersStore.error || t('common.messages.error'), life: 3000 })
  } finally {
    memberSubmitting.value = false
  }
}

function confirmDeleteMember(member) {
  confirm.require({
    message: t('settings.members.dialog.deleteText', { name: member.user?.full_name }),
    header: t('settings.members.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDeleteMember(member),
  })
}

async function handleDeleteMember(member) {
  try {
    await membersStore.destroy(member.id)
    toast.add({ severity: 'success', summary: t('settings.members.messages.memberDeleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: membersStore.error || t('common.messages.error'), life: 3000 })
  }
}

// ── Roles ──
const roleDialog = ref(false)
const editingRole = ref(null)
const roleForm = ref({ name: '', code: '' })
const roleSubmitting = ref(false)

function openAddRole() {
  editingRole.value = null
  roleForm.value = { name: '', code: '' }
  roleDialog.value = true
}

function openEditRole(role) {
  editingRole.value = role
  roleForm.value = { name: role.name, code: role.code }
  roleDialog.value = true
}

async function handleRoleSubmit() {
  roleSubmitting.value = true
  try {
    if (editingRole.value) {
      await rolesStore.update(editingRole.value.id, roleForm.value)
      toast.add({ severity: 'success', summary: t('settings.roles.messages.updated'), life: 3000 })
    } else {
      await rolesStore.create(roleForm.value)
      toast.add({ severity: 'success', summary: t('settings.roles.messages.created'), life: 3000 })
    }
    roleDialog.value = false
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: rolesStore.error || t('common.messages.error'), life: 3000 })
  } finally {
    roleSubmitting.value = false
  }
}

function confirmDeleteRole(role) {
  confirm.require({
    message: t('settings.roles.dialog.deleteText', { name: role.name }),
    header: t('settings.roles.dialog.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('common.delete'),
    rejectLabel: t('common.cancel'),
    acceptProps: { severity: 'danger' },
    accept: () => handleDeleteRole(role),
  })
}

async function handleDeleteRole(role) {
  try {
    await rolesStore.destroy(role.id)
    toast.add({ severity: 'success', summary: t('settings.roles.messages.deleted'), life: 3000 })
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    toast.add({ severity: 'error', summary: rolesStore.error || t('common.messages.error'), life: 3000 })
  }
}

onMounted(() => {
  loadOrg()
  membersStore.fetchAll()
  rolesStore.fetchAll()
})

defineExpose({
  tab, orgForm, orgSaving, orgError, orgSettings, handleOrgSave, loadOrg,
  telegramForm, saveTelegram, testTelegram, telegramError, telegramSuccess,
  roleOptions, roleLabel,
  memberDialog, editingMember, memberForm, memberSubmitting,
  openAddMember, openEditMember, handleMemberSubmit, confirmDeleteMember, handleDeleteMember,
  roleDialog, editingRole, roleForm, roleSubmitting,
  openAddRole, openEditRole, handleRoleSubmit, confirmDeleteRole, handleDeleteRole,
})
</script>
