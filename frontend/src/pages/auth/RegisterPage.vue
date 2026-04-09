<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card elevation="4">
          <v-card-title class="text-h5 text-center pa-6">Регистрация</v-card-title>
          <v-card-text>
            <v-alert v-if="authStore.error" type="error" class="mb-4" closable @click:close="authStore.error = null">
              {{ Array.isArray(authStore.error) ? authStore.error.join(', ') : authStore.error }}
            </v-alert>
            <v-form v-model="formValid" @submit.prevent="handleRegister">
              <v-text-field
                v-model="form.organization_name"
                label="Название организации"
                :rules="[rules.required]"
                prepend-inner-icon="mdi-domain"
                variant="outlined"
                class="mb-2"
              />
              <v-row>
                <v-col cols="6">
                  <v-text-field
                    v-model="form.first_name"
                    label="Имя"
                    :rules="[rules.required]"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="6">
                  <v-text-field
                    v-model="form.last_name"
                    label="Фамилия"
                    :rules="[rules.required]"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
              <v-text-field
                v-model="form.email"
                label="Email"
                type="email"
                :rules="[rules.required, rules.email]"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                class="mb-2"
              />
              <v-text-field
                v-model="form.password"
                label="Пароль"
                :type="showPassword ? 'text' : 'password'"
                :rules="[rules.required, rules.minLength]"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                class="mb-2"
              />
              <v-text-field
                v-model="form.password_confirmation"
                label="Подтверждение пароля"
                :type="showPassword ? 'text' : 'password'"
                :rules="[rules.required, rules.passwordMatch]"
                prepend-inner-icon="mdi-lock-check"
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
                Создать аккаунт
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions class="justify-center pb-4">
            <span class="text-body-2">Уже есть аккаунт?</span>
            <v-btn variant="text" color="primary" :to="{ name: 'login' }">Войти</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formValid = ref(false)
const showPassword = ref(false)

const form = reactive({
  organization_name: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const rules = {
  required: (v) => !!v || 'Обязательное поле',
  email: (v) => /.+@.+\..+/.test(v) || 'Некорректный email',
  minLength: (v) => (v && v.length >= 8) || 'Минимум 8 символов',
  passwordMatch: (v) => v === form.password || 'Пароли не совпадают',
}

async function handleRegister() {
  if (!formValid.value) return

  try {
    await authStore.signUp(form)
    router.push('/')
  } catch {
    // error handled by store
  }
}
</script>
