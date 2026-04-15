<template>
  <v-container>
    <h1 class="text-h4 mb-4">{{ $t('settings.title') }}</h1>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="general">{{ $t('settings.tabs.general') }}</v-tab>
      <v-tab value="integrations">{{ $t('settings.tabs.integrations') }}</v-tab>
      <v-tab value="members">{{ $t('settings.tabs.members') }}</v-tab>
      <v-tab value="roles">{{ $t('settings.tabs.roles') }}</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="general">
        <v-alert v-if="orgError" type="error" class="mb-4" closable @click:close="orgError = null">
          {{ Array.isArray(orgError) ? orgError.join(', ') : orgError }}
        </v-alert>
        <v-form @submit.prevent="handleOrgSave" :disabled="orgSaving">
          <v-text-field v-model="orgForm.name" :label="$t('settings.general.orgName')" class="mb-2" />
          <v-select v-model="orgForm.currency" :label="$t('settings.general.currency')" :items="currencyList" item-title="label" item-value="code" class="mb-2" />
          <v-select v-model="orgForm.locale" :label="$t('settings.general.language')" :items="localeOptions" item-title="label" item-value="value" class="mb-2" />
          <v-btn type="submit" color="primary" :loading="orgSaving">{{ $t('common.save') }}</v-btn>
        </v-form>
        <v-snackbar v-model="orgSnackbar" :timeout="3000" color="success">{{ $t('common.messages.saved') }}</v-snackbar>
      </v-window-item>

      <v-window-item value="integrations">
        <h2 class="text-h5 mb-4">{{ $t('settings.integrations.telegramTitle') }}</h2>
        <v-alert v-if="telegramError" type="error" class="mb-4" closable @click:close="telegramError = null">
          {{ telegramError }}
        </v-alert>
        <v-alert v-if="telegramSuccess" type="success" class="mb-4" closable @click:close="telegramSuccess = false">
          {{ $t('settings.integrations.testSuccess') }}
        </v-alert>
        <v-text-field v-model="telegramForm.bot_token" :label="$t('settings.integrations.botToken')" class="mb-2" />
        <v-text-field v-model="telegramForm.chat_id" :label="$t('settings.integrations.chatId')" class="mb-2" />
        <div class="d-flex ga-2 mb-4">
          <v-btn color="primary" :loading="telegramSaving" @click="saveTelegram">{{ $t('common.save') }}</v-btn>
          <v-btn variant="outlined" :loading="telegramTesting" @click="testTelegram" :disabled="!telegramForm.bot_token || !telegramForm.chat_id">{{ $t('settings.integrations.testButton') }}</v-btn>
        </div>
        <v-card variant="outlined" class="pa-3">
          <p class="text-body-2 text-medium-emphasis" style="white-space: pre-line">{{ $t('settings.integrations.instructions') }}</p>
        </v-card>
      </v-window-item>

      <v-window-item value="members">
        <div class="d-flex align-center mb-4">
          <h2 class="text-h5">{{ $t('settings.members.title') }}</h2>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddMember">{{ $t('common.add') }}</v-btn>
        </div>

        <v-alert v-if="membersStore.error" type="error" class="mb-4" closable @click:close="membersStore.error = null">
          {{ Array.isArray(membersStore.error) ? membersStore.error.join(', ') : membersStore.error }}
        </v-alert>

        <v-data-table
          v-if="membersStore.items.length || membersStore.loading"
          :headers="memberHeaders"
          :items="membersStore.items"
          :loading="membersStore.loading"
          density="comfortable"
        >
          <template v-slot:item.user="{ item }">
            {{ item.user.full_name }} ({{ item.user.email }})
          </template>
          <template v-slot:item.role="{ item }">
            {{ roleLabel(item.role) }}{{ item.role_name ? ` — ${item.role_name}` : '' }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditMember(item)" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDeleteMember(item)" />
          </template>
        </v-data-table>
        <v-empty-state v-else-if="!membersStore.loading" icon="mdi-account-group" :title="$t('settings.members.emptyState.title')" />

        <!-- Add/Edit member dialog -->
        <v-dialog v-model="memberDialog" max-width="500">
          <v-card>
            <v-card-title>{{ editingMember ? $t('settings.members.editTitle') : $t('settings.members.addTitle') }}</v-card-title>
            <v-card-text>
              <template v-if="!editingMember">
                <v-text-field v-model="memberForm.email" :label="$t('settings.members.form.email')" class="mb-2" />
                <v-text-field v-model="memberForm.first_name" :label="$t('settings.members.form.firstName')" class="mb-2" />
                <v-text-field v-model="memberForm.last_name" :label="$t('settings.members.form.lastName')" class="mb-2" />
                <v-text-field v-model="memberForm.password" :label="$t('settings.members.form.password')" type="password" class="mb-2" />
              </template>
              <v-select
                v-model="memberForm.role"
                :label="$t('settings.members.form.role')"
                :items="roleOptions"
                item-title="label"
                item-value="value"
                class="mb-2"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="memberDialog = false">{{ $t('common.cancel') }}</v-btn>
              <v-btn color="primary" :loading="memberSubmitting" @click="handleMemberSubmit">
                {{ editingMember ? $t('common.save') : $t('common.add') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete member dialog -->
        <v-dialog v-model="deleteMemberDialog" max-width="400">
          <v-card>
            <v-card-title>{{ $t('settings.members.dialog.deleteTitle') }}</v-card-title>
            <v-card-text>{{ $t('settings.members.dialog.deleteText', { name: deletingMember?.user?.full_name }) }}</v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="deleteMemberDialog = false">{{ $t('common.cancel') }}</v-btn>
              <v-btn color="error" @click="handleDeleteMember">{{ $t('common.delete') }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-snackbar v-model="memberSnackbar" :timeout="3000" :color="memberSnackbarColor">
          {{ memberSnackbarText }}
        </v-snackbar>
      </v-window-item>

      <v-window-item value="roles">
        <div class="d-flex align-center mb-4">
          <h2 class="text-h5">{{ $t('settings.roles.title') }}</h2>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddRole">{{ $t('common.add') }}</v-btn>
        </div>

        <v-alert v-if="rolesStore.error" type="error" class="mb-4" closable @click:close="rolesStore.error = null">
          {{ Array.isArray(rolesStore.error) ? rolesStore.error.join(', ') : rolesStore.error }}
        </v-alert>

        <v-data-table
          v-if="rolesStore.items.length || rolesStore.loading"
          :headers="roleHeaders"
          :items="rolesStore.items"
          :loading="rolesStore.loading"
          density="comfortable"
        >
          <template v-slot:item.is_system="{ item }">
            {{ item.is_system ? $t('common.yes') : $t('common.no') }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditRole(item)" :disabled="item.is_system" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDeleteRole(item)" :disabled="item.is_system" />
          </template>
        </v-data-table>
        <v-empty-state v-else-if="!rolesStore.loading" icon="mdi-shield-account" :title="$t('settings.roles.emptyState.title')" />

        <!-- Role dialog -->
        <v-dialog v-model="roleDialog" max-width="500">
          <v-card>
            <v-card-title>{{ editingRole ? $t('settings.roles.editTitle') : $t('settings.roles.addTitle') }}</v-card-title>
            <v-card-text>
              <v-text-field v-model="roleForm.name" :label="$t('settings.roles.form.name')" class="mb-2" />
              <v-text-field v-model="roleForm.code" :label="$t('settings.roles.form.code')" class="mb-2" />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="roleDialog = false">{{ $t('common.cancel') }}</v-btn>
              <v-btn color="primary" :loading="roleSubmitting" @click="handleRoleSubmit">
                {{ editingRole ? $t('common.save') : $t('common.add') }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete role dialog -->
        <v-dialog v-model="deleteRoleDialog" max-width="400">
          <v-card>
            <v-card-title>{{ $t('settings.roles.dialog.deleteTitle') }}</v-card-title>
            <v-card-text>{{ $t('settings.roles.dialog.deleteText', { name: deletingRole?.name }) }}</v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="deleteRoleDialog = false">{{ $t('common.cancel') }}</v-btn>
              <v-btn color="error" @click="handleDeleteRole">{{ $t('common.delete') }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-snackbar v-model="roleSnackbar" :timeout="3000" :color="roleSnackbarColor">
          {{ roleSnackbarText }}
        </v-snackbar>
      </v-window-item>
    </v-window>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
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

const tab = ref('general')

// -- Telegram tab --
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
    console.error(e)
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
    const response = await apiClient.post('/organization/test_telegram')
    telegramSuccess.value = true
  } catch (e) {
    console.error(e)
    telegramError.value = t('settings.integrations.testError')
  } finally {
    telegramTesting.value = false
  }
}

// -- General tab --
const orgForm = ref({ name: '', currency: 'RUB', locale: 'ru' })
const currencyList = CURRENCY_LIST
const localeOptions = [
  { label: 'Русский', value: 'ru' },
  { label: 'English', value: 'en' },
]
const orgSaving = ref(false)
const orgError = ref(null)
const orgSnackbar = ref(false)
// Mirrors the server's full settings JSON so locale + telegram saves don't
// overwrite each other (backend replaces the whole JSON column on update).
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
  } catch (e) { console.error(e);
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
    orgSnackbar.value = true
  } catch (e) {
    orgError.value = e.response?.data?.error || t('common.messages.error')
  } finally {
    orgSaving.value = false
  }
}

// -- Members tab --
const memberHeaders = computed(() => [
  { title: t('settings.members.columns.member'), key: 'user' },
  { title: t('settings.members.columns.role'), key: 'role' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

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
const deleteMemberDialog = ref(false)
const deletingMember = ref(null)
const memberSnackbar = ref(false)
const memberSnackbarText = ref('')
const memberSnackbarColor = ref('success')

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
      memberSnackbarText.value = t('settings.members.messages.roleUpdated')
    } else {
      await membersStore.create(memberForm.value)
      memberSnackbarText.value = t('settings.members.messages.memberAdded')
    }
    memberSnackbarColor.value = 'success'
    memberSnackbar.value = true
    memberDialog.value = false
  } catch (e) { console.error(e);
    memberSnackbarText.value = membersStore.error || t('common.messages.error')
    memberSnackbarColor.value = 'error'
    memberSnackbar.value = true
  } finally {
    memberSubmitting.value = false
  }
}

function confirmDeleteMember(member) {
  deletingMember.value = member
  deleteMemberDialog.value = true
}

async function handleDeleteMember() {
  try {
    await membersStore.destroy(deletingMember.value.id)
    memberSnackbarText.value = t('settings.members.messages.memberDeleted')
    memberSnackbarColor.value = 'success'
    memberSnackbar.value = true
  } catch (e) { console.error(e);
    memberSnackbarText.value = membersStore.error || t('common.messages.error')
    memberSnackbarColor.value = 'error'
    memberSnackbar.value = true
  } finally {
    deleteMemberDialog.value = false
    deletingMember.value = null
  }
}

// -- Roles tab --
const roleHeaders = computed(() => [
  { title: t('settings.roles.columns.name'), key: 'name' },
  { title: t('settings.roles.columns.code'), key: 'code' },
  { title: t('settings.roles.columns.isSystem'), key: 'is_system' },
  { title: t('settings.roles.columns.membersCount'), key: 'members_count' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
])

const roleDialog = ref(false)
const editingRole = ref(null)
const roleForm = ref({ name: '', code: '' })
const roleSubmitting = ref(false)
const deleteRoleDialog = ref(false)
const deletingRole = ref(null)
const roleSnackbar = ref(false)
const roleSnackbarText = ref('')
const roleSnackbarColor = ref('success')

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
      roleSnackbarText.value = t('settings.roles.messages.updated')
    } else {
      await rolesStore.create(roleForm.value)
      roleSnackbarText.value = t('settings.roles.messages.created')
    }
    roleSnackbarColor.value = 'success'
    roleSnackbar.value = true
    roleDialog.value = false
  } catch (e) { console.error(e);
    roleSnackbarText.value = rolesStore.error || t('common.messages.error')
    roleSnackbarColor.value = 'error'
    roleSnackbar.value = true
  } finally {
    roleSubmitting.value = false
  }
}

function confirmDeleteRole(role) {
  deletingRole.value = role
  deleteRoleDialog.value = true
}

async function handleDeleteRole() {
  try {
    await rolesStore.destroy(deletingRole.value.id)
    roleSnackbarText.value = t('settings.roles.messages.deleted')
    roleSnackbarColor.value = 'success'
    roleSnackbar.value = true
  } catch (e) { console.error(e);
    roleSnackbarText.value = rolesStore.error || t('common.messages.error')
    roleSnackbarColor.value = 'error'
    roleSnackbar.value = true
  } finally {
    deleteRoleDialog.value = false
    deletingRole.value = null
  }
}

onMounted(() => {
  loadOrg()
  membersStore.fetchAll()
  rolesStore.fetchAll()
})

defineExpose({
  tab, orgForm, orgSaving, orgError, orgSnackbar, handleOrgSave, loadOrg,
  memberHeaders, roleOptions, roleLabel,
  memberDialog, editingMember, memberForm, memberSubmitting,
  deleteMemberDialog, deletingMember, memberSnackbar, memberSnackbarText, memberSnackbarColor,
  openAddMember, openEditMember, handleMemberSubmit, confirmDeleteMember, handleDeleteMember,
  roleHeaders, roleDialog, editingRole, roleForm, roleSubmitting,
  deleteRoleDialog, deletingRole, roleSnackbar, roleSnackbarText, roleSnackbarColor,
  openAddRole, openEditRole, handleRoleSubmit, confirmDeleteRole, handleDeleteRole,
})
</script>
