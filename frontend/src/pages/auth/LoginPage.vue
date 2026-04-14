<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="4">
          <v-card-title class="text-h5 text-center pa-6">{{ $t('auth.login.title') }}</v-card-title>
          <v-card-text>
            <v-alert v-if="authStore.error" type="error" class="mb-4" closable @click:close="authStore.error = null">
              {{ authStore.error }}
            </v-alert>
            <v-form v-model="formValid" @submit.prevent="handleLogin">
              <v-text-field
                v-model="form.email"
                :label="$t('auth.login.emailLabel')"
                type="email"
                :rules="[rules.required, rules.email]"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                class="mb-2"
              />
              <v-text-field
                v-model="form.password"
                :label="$t('auth.login.passwordLabel')"
                :type="showPassword ? 'text' : 'password'"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                class="mb-2"
              />
              <v-btn
                type="submit"
                color="primary"
                block
                size="large"
                :loading="authStore.loading"
              >
                {{ $t('auth.login.submitButton') }}
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions class="justify-center pb-4">
            <span class="text-body-2">{{ $t('auth.login.noAccount') }}</span>
            <v-btn variant="text" color="primary" :to="{ name: 'register' }">{{ $t('auth.login.registerLink') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'

const { t } = useI18n()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const formValid = ref(false)
const showPassword = ref(false)

const form = reactive({
  email: '',
  password: '',
})

const rules = {
  required: (v) => !!v || t('common.validation.required'),
  email: (v) => /.+@.+\..+/.test(v) || t('common.validation.invalidEmail'),
}

async function handleLogin() {
  if (!formValid.value) return

  try {
    const response = await authStore.signIn(form)
    if (response.organizations.length > 1) {
      router.push({ name: 'selectOrganization' })
    } else {
      router.push(route.query.redirect || '/')
    }
  } catch (e) { console.error(e);
    // error handled by store
  }
}

defineExpose({ form, formValid, showPassword, rules, handleLogin })
</script>
