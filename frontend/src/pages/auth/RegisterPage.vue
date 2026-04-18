<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8 bg-surface-50 dark:bg-surface-950">
    <div class="w-full max-w-lg">
      <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-0 dark:bg-surface-900 shadow-sm">
        <div class="px-6 py-6 border-b border-surface-200 dark:border-surface-700">
          <h1 class="text-center text-xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
            {{ $t('auth.register.title') }}
          </h1>
        </div>

        <div class="px-6 py-6 space-y-4">
          <div
            v-if="authStore.error"
            class="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-3 py-2 text-sm text-red-800 dark:text-red-200"
          >
            <i class="pi pi-exclamation-circle mt-0.5" aria-hidden="true" />
            <span class="flex-1">
              {{ Array.isArray(authStore.error) ? authStore.error.join(', ') : authStore.error }}
            </span>
            <button
              type="button"
              class="text-red-500 hover:text-red-700"
              :aria-label="$t('common.close')"
              @click="authStore.error = null"
            >
              <i class="pi pi-times" />
            </button>
          </div>

          <form @submit.prevent="handleRegister" class="space-y-4" novalidate>
            <!-- Organization name -->
            <div>
              <label for="reg-org" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('auth.register.orgNameLabel') }}
              </label>
              <div class="relative">
                <i class="pi pi-building absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden="true" />
                <InputText
                  id="reg-org"
                  v-model="form.organization_name"
                  class="w-full pl-10"
                  :invalid="!!fieldErrors.organization_name"
                  @blur="validateField('organization_name')"
                />
              </div>
              <p v-if="fieldErrors.organization_name" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ $t(fieldErrors.organization_name) }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="reg-first" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                  {{ $t('auth.register.firstNameLabel') }}
                </label>
                <InputText
                  id="reg-first"
                  v-model="form.first_name"
                  class="w-full"
                  :invalid="!!fieldErrors.first_name"
                  @blur="validateField('first_name')"
                />
                <p v-if="fieldErrors.first_name" class="mt-1 text-xs text-red-600 dark:text-red-400">
                  {{ $t(fieldErrors.first_name) }}
                </p>
              </div>
              <div>
                <label for="reg-last" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                  {{ $t('auth.register.lastNameLabel') }}
                </label>
                <InputText
                  id="reg-last"
                  v-model="form.last_name"
                  class="w-full"
                  :invalid="!!fieldErrors.last_name"
                  @blur="validateField('last_name')"
                />
                <p v-if="fieldErrors.last_name" class="mt-1 text-xs text-red-600 dark:text-red-400">
                  {{ $t(fieldErrors.last_name) }}
                </p>
              </div>
            </div>

            <div>
              <label for="reg-email" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('auth.register.emailLabel') }}
              </label>
              <div class="relative">
                <i class="pi pi-envelope absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden="true" />
                <InputText
                  id="reg-email"
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

            <div>
              <label for="reg-password" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('auth.register.passwordLabel') }}
              </label>
              <div class="relative">
                <i class="pi pi-lock absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden="true" />
                <InputText
                  id="reg-password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
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

            <div>
              <label for="reg-pw-confirm" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                {{ $t('auth.register.passwordConfirmLabel') }}
              </label>
              <div class="relative">
                <i class="pi pi-verified absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" aria-hidden="true" />
                <InputText
                  id="reg-pw-confirm"
                  v-model="form.password_confirmation"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  class="w-full pl-10"
                  :invalid="!!fieldErrors.password_confirmation"
                  @blur="validateField('password_confirmation')"
                />
              </div>
              <p v-if="fieldErrors.password_confirmation" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ $t(fieldErrors.password_confirmation) }}
              </p>
            </div>

            <Button
              type="submit"
              :label="$t('auth.register.submitButton')"
              :loading="authStore.loading"
              class="w-full"
              size="large"
            />
          </form>
        </div>

        <div class="px-6 py-4 border-t border-surface-200 dark:border-surface-700 text-center">
          <span class="text-sm text-surface-600 dark:text-surface-300">
            {{ $t('auth.register.hasAccount') }}
          </span>
          <RouterLink
            :to="{ name: 'login' }"
            class="ml-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
          >
            {{ $t('auth.register.loginLink') }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { registerSchema, validate } from '../../schemas/auth'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  organization_name: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const showPassword = ref(false)
const fieldErrors = ref({})

function validateField(field) {
  const { errors } = validate(registerSchema, form)
  fieldErrors.value = { ...fieldErrors.value, [field]: errors[field] || '' }
}

async function handleRegister() {
  const { valid, errors } = validate(registerSchema, form)
  fieldErrors.value = errors
  if (!valid) return

  try {
    await authStore.signUp(form)
    router.push('/')
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
  }
}

defineExpose({ form, showPassword, fieldErrors, validateField, handleRegister })
</script>
