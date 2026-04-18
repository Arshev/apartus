<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-surface-50 dark:bg-surface-950">
    <div class="w-full max-w-md">
      <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-sm">
        <div class="px-6 py-6 border-b border-surface-200 dark:border-surface-700">
          <h1 class="text-center text-xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
            {{ $t('auth.login.title') }}
          </h1>
        </div>

        <div class="px-6 py-6 space-y-4">
          <div
            v-if="authStore.error"
            class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200"
          >
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">{{ authStore.error }}</span>
            <button
              type="button"
              class="text-red-500 hover:text-red-700"
              :aria-label="$t('common.close')"
              @click="authStore.error = null"
            >
              <i class="pi pi-times" />
            </button>
          </div>

          <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
            <!-- Email -->
            <div>
              <label for="login-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('auth.login.emailLabel') }}
              </label>
              <div class="relative">
                <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden="true" />
                <InputText
                  id="login-email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  class="w-full pl-10"
                  :invalid="!!fieldErrors.email"
                  @blur="validateField('email')"
                />
              </div>
              <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ $t(fieldErrors.email) }}
              </p>
            </div>

            <!-- Password -->
            <div>
              <label for="login-password" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('auth.login.passwordLabel') }}
              </label>
              <div class="relative">
                <i class="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden="true" />
                <InputText
                  id="login-password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  class="w-full pl-10 pr-10"
                  :invalid="!!fieldErrors.password"
                  @blur="validateField('password')"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-200"
                  :aria-label="showPassword ? $t('auth.login.hidePassword') : $t('auth.login.showPassword')"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
                </button>
              </div>
              <p v-if="fieldErrors.password" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ $t(fieldErrors.password) }}
              </p>
            </div>

            <Button
              type="submit"
              :label="$t('auth.login.submitButton')"
              :loading="authStore.loading"
              class="w-full"
              size="large"
            />
          </form>
        </div>

        <div class="px-6 py-4 border-t border-surface-200 dark:border-surface-700 text-center">
          <span class="text-sm text-surface-600 dark:text-surface-300">
            {{ $t('auth.login.noAccount') }}
          </span>
          <RouterLink
            :to="{ name: 'register' }"
            class="ml-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {{ $t('auth.login.registerLink') }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { loginSchema, validate } from '../../schemas/auth'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({ email: '', password: '' })
const showPassword = ref(false)
const fieldErrors = ref({})

function validateField(field) {
  const { errors } = validate(loginSchema, form)
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] || '' }
}

async function handleLogin() {
  const { valid, errors } = validate(loginSchema, form)
  fieldErrors.value = errors
  if (!valid) return

  try {
    const response = await authStore.signIn(form)
    if (response.organizations.length > 1) {
      router.push({ name: 'selectOrganization' })
    } else {
      router.push(route.query.redirect || '/')
    }
  } catch (e) {
    // error shown via authStore.error binding; log для dev
    if (import.meta.env.DEV) console.error(e)
  }
}

defineExpose({ form, showPassword, fieldErrors, validateField, handleLogin })
</script>
