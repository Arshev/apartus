<template>
  <v-container>
    <h1 class="text-h4 mb-4">Настройки организации</h1>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="general">Общие</v-tab>
      <v-tab value="integrations">Интеграции</v-tab>
      <v-tab value="members">Участники</v-tab>
      <v-tab value="roles">Роли</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="general">
        <v-alert v-if="orgError" type="error" class="mb-4" closable @click:close="orgError = null">
          {{ Array.isArray(orgError) ? orgError.join(', ') : orgError }}
        </v-alert>
        <v-form @submit.prevent="handleOrgSave" :disabled="orgSaving">
          <v-text-field v-model="orgForm.name" label="Название организации" class="mb-2" />
          <v-select v-model="orgForm.currency" label="Валюта" :items="currencyList" item-title="label" item-value="code" class="mb-2" />
          <v-btn type="submit" color="primary" :loading="orgSaving">Сохранить</v-btn>
        </v-form>
        <v-snackbar v-model="orgSnackbar" :timeout="3000" color="success">Сохранено</v-snackbar>
      </v-window-item>

      <v-window-item value="integrations">
        <h2 class="text-h5 mb-4">Telegram уведомления</h2>
        <v-alert v-if="telegramError" type="error" class="mb-4" closable @click:close="telegramError = null">
          {{ telegramError }}
        </v-alert>
        <v-alert v-if="telegramSuccess" type="success" class="mb-4" closable @click:close="telegramSuccess = false">
          Тестовое сообщение отправлено!
        </v-alert>
        <v-text-field v-model="telegramForm.bot_token" label="Bot Token (от @BotFather)" class="mb-2" />
        <v-text-field v-model="telegramForm.chat_id" label="Chat ID" class="mb-2" />
        <div class="d-flex ga-2 mb-4">
          <v-btn color="primary" :loading="telegramSaving" @click="saveTelegram">Сохранить</v-btn>
          <v-btn variant="outlined" :loading="telegramTesting" @click="testTelegram" :disabled="!telegramForm.bot_token || !telegramForm.chat_id">Тест</v-btn>
        </div>
        <v-card variant="outlined" class="pa-3">
          <p class="text-body-2 text-medium-emphasis">
            1. Создайте бота через <a href="https://t.me/BotFather" target="_blank">@BotFather</a> в Telegram<br>
            2. Скопируйте Bot Token сюда<br>
            3. Добавьте бота в группу или напишите ему /start<br>
            4. Узнайте Chat ID через <a href="https://t.me/getmyid_bot" target="_blank">@getmyid_bot</a><br>
            5. Нажмите "Тест" для проверки
          </p>
        </v-card>
      </v-window-item>

      <v-window-item value="members">
        <div class="d-flex align-center mb-4">
          <h2 class="text-h5">Участники</h2>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddMember">Добавить</v-btn>
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
        <v-empty-state v-else-if="!membersStore.loading" icon="mdi-account-group" title="Нет участников" />

        <!-- Add/Edit member dialog -->
        <v-dialog v-model="memberDialog" max-width="500">
          <v-card>
            <v-card-title>{{ editingMember ? 'Редактировать роль' : 'Добавить участника' }}</v-card-title>
            <v-card-text>
              <template v-if="!editingMember">
                <v-text-field v-model="memberForm.email" label="Email" class="mb-2" />
                <v-text-field v-model="memberForm.first_name" label="Имя" class="mb-2" />
                <v-text-field v-model="memberForm.last_name" label="Фамилия" class="mb-2" />
                <v-text-field v-model="memberForm.password" label="Пароль" type="password" class="mb-2" />
              </template>
              <v-select
                v-model="memberForm.role"
                label="Роль"
                :items="roleOptions"
                item-title="label"
                item-value="value"
                class="mb-2"
              />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="memberDialog = false">Отмена</v-btn>
              <v-btn color="primary" :loading="memberSubmitting" @click="handleMemberSubmit">
                {{ editingMember ? 'Сохранить' : 'Добавить' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete member dialog -->
        <v-dialog v-model="deleteMemberDialog" max-width="400">
          <v-card>
            <v-card-title>Удалить участника?</v-card-title>
            <v-card-text>{{ deletingMember?.user?.full_name }} будет удалён из организации.</v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="deleteMemberDialog = false">Отмена</v-btn>
              <v-btn color="error" @click="handleDeleteMember">Удалить</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-snackbar v-model="memberSnackbar" :timeout="3000" :color="memberSnackbarColor">
          {{ memberSnackbarText }}
        </v-snackbar>
      </v-window-item>

      <v-window-item value="roles">
        <div class="d-flex align-center mb-4">
          <h2 class="text-h5">Роли</h2>
          <v-spacer />
          <v-btn color="primary" prepend-icon="mdi-plus" @click="openAddRole">Добавить</v-btn>
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
            {{ item.is_system ? 'Да' : 'Нет' }}
          </template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="openEditRole(item)" :disabled="item.is_system" />
            <v-btn icon="mdi-delete" variant="text" size="small" color="error" @click="confirmDeleteRole(item)" :disabled="item.is_system" />
          </template>
        </v-data-table>
        <v-empty-state v-else-if="!rolesStore.loading" icon="mdi-shield-account" title="Нет ролей" />

        <!-- Role dialog -->
        <v-dialog v-model="roleDialog" max-width="500">
          <v-card>
            <v-card-title>{{ editingRole ? 'Редактировать роль' : 'Новая роль' }}</v-card-title>
            <v-card-text>
              <v-text-field v-model="roleForm.name" label="Название" class="mb-2" />
              <v-text-field v-model="roleForm.code" label="Код" class="mb-2" />
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="roleDialog = false">Отмена</v-btn>
              <v-btn color="primary" :loading="roleSubmitting" @click="handleRoleSubmit">
                {{ editingRole ? 'Сохранить' : 'Создать' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Delete role dialog -->
        <v-dialog v-model="deleteRoleDialog" max-width="400">
          <v-card>
            <v-card-title>Удалить роль?</v-card-title>
            <v-card-text>Роль «{{ deletingRole?.name }}» будет удалена.</v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn @click="deleteRoleDialog = false">Отмена</v-btn>
              <v-btn color="error" @click="handleDeleteRole">Удалить</v-btn>
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
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useMembersStore } from '../stores/members'
import { useRolesStore } from '../stores/roles'
import * as organizationsApi from '../api/organizations'
import apiClient from '../api/client'
import { CURRENCY_LIST } from '../utils/currency'

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
    await organizationsApi.update({
      settings: {
        telegram_bot_token: telegramForm.value.bot_token,
        telegram_chat_id: telegramForm.value.chat_id,
      },
    })
    telegramSuccess.value = false
  } catch (e) {
    console.error(e)
    telegramError.value = 'Не удалось сохранить'
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
    telegramError.value = 'Не удалось отправить тестовое сообщение'
  } finally {
    telegramTesting.value = false
  }
}

// -- General tab --
const orgForm = ref({ name: '', currency: 'RUB' })
const currencyList = CURRENCY_LIST
const orgSaving = ref(false)
const orgError = ref(null)
const orgSnackbar = ref(false)

async function loadOrg() {
  if (!authStore.organization?.id) return
  try {
    const org = await organizationsApi.get()
    orgForm.value.name = org.name
    orgForm.value.currency = org.currency || 'RUB'
    telegramForm.value.bot_token = org.settings?.telegram_bot_token || ''
    telegramForm.value.chat_id = org.settings?.telegram_chat_id || ''
  } catch (e) { console.error(e);
    orgError.value = 'Не удалось загрузить настройки'
  }
}

async function handleOrgSave() {
  orgSaving.value = true
  orgError.value = null
  try {
    await organizationsApi.update(orgForm.value)
    orgSnackbar.value = true
  } catch (e) {
    orgError.value = e.response?.data?.error || 'Ошибка сохранения'
  } finally {
    orgSaving.value = false
  }
}

// -- Members tab --
const memberHeaders = [
  { title: 'Участник', key: 'user' },
  { title: 'Роль', key: 'role' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

const roleOptions = [
  { label: 'Участник', value: 'member' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Владелец', value: 'owner' },
]

function roleLabel(role) {
  return roleOptions.find((r) => r.value === role)?.label || role
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
      memberSnackbarText.value = 'Роль обновлена'
    } else {
      await membersStore.create(memberForm.value)
      memberSnackbarText.value = 'Участник добавлен'
    }
    memberSnackbarColor.value = 'success'
    memberSnackbar.value = true
    memberDialog.value = false
  } catch (e) { console.error(e);
    memberSnackbarText.value = membersStore.error || 'Ошибка'
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
    memberSnackbarText.value = 'Участник удалён'
    memberSnackbarColor.value = 'success'
    memberSnackbar.value = true
  } catch (e) { console.error(e);
    memberSnackbarText.value = membersStore.error || 'Ошибка'
    memberSnackbarColor.value = 'error'
    memberSnackbar.value = true
  } finally {
    deleteMemberDialog.value = false
    deletingMember.value = null
  }
}

// -- Roles tab --
const roleHeaders = [
  { title: 'Название', key: 'name' },
  { title: 'Код', key: 'code' },
  { title: 'Системная', key: 'is_system' },
  { title: 'Участников', key: 'members_count' },
  { title: '', key: 'actions', sortable: false, align: 'end' },
]

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
      roleSnackbarText.value = 'Роль обновлена'
    } else {
      await rolesStore.create(roleForm.value)
      roleSnackbarText.value = 'Роль создана'
    }
    roleSnackbarColor.value = 'success'
    roleSnackbar.value = true
    roleDialog.value = false
  } catch (e) { console.error(e);
    roleSnackbarText.value = rolesStore.error || 'Ошибка'
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
    roleSnackbarText.value = 'Роль удалена'
    roleSnackbarColor.value = 'success'
    roleSnackbar.value = true
  } catch (e) { console.error(e);
    roleSnackbarText.value = rolesStore.error || 'Ошибка'
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
