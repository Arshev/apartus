<template>
  <div class="mx-auto max-w-3xl px-4 py-12">
    <!-- FT-036 P0 smoke: PrimeVue primitives + Tailwind utilities + Zod. -->
    <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-8 shadow-sm">
      <div class="flex items-start gap-4">
        <i class="pi pi-wrench text-4xl text-primary-500 dark:text-primary-400" aria-hidden="true" />
        <div class="flex-1">
          <h1 class="text-2xl font-display font-medium tracking-tight text-surface-950 dark:text-surface-50">
            {{ $t('placeholder.title') }}
          </h1>
          <p class="mt-2 text-surface-600 dark:text-surface-300">
            {{ $t('placeholder.text', { title }) }}
          </p>

          <!-- Smoke interaction: dark toggle + validated input -->
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label for="smoke-input" class="block text-sm font-medium text-surface-700 dark:text-surface-200 mb-1">
                Name
              </label>
              <InputText
                id="smoke-input"
                v-model="smokeInput"
                class="w-full"
                :invalid="!!smokeError"
                @update:model-value="validateSmoke"
              />
              <p v-if="smokeError" class="mt-1 text-xs text-red-600 dark:text-red-400">
                {{ smokeError }}
              </p>
            </div>

            <div class="flex items-end">
              <Button
                :label="isDark ? 'Light mode' : 'Dark mode'"
                severity="secondary"
                size="small"
                @click="toggleDark"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { z } from 'zod'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'

const route = useRoute()

const titles = {
  '/properties': 'Properties',
  '/units': 'Units',
  '/amenities': 'Amenities',
  '/branches': 'Branches',
}

const title = computed(() => titles[route.path] || route.path)

// Smoke validation: Zod schema + safeParse.
const smokeSchema = z.string().min(2, 'At least 2 chars').max(40)
const smokeInput = ref('')
const smokeError = ref('')

function validateSmoke(v) {
  smokeInput.value = v || ''
  if (!smokeInput.value) {
    smokeError.value = ''
    return
  }
  const result = smokeSchema.safeParse(smokeInput.value)
  smokeError.value = result.success ? '' : result.error.issues[0]?.message || 'Invalid'
}

// Smoke dark-mode toggle: flip <html class="dark">.
const isDark = ref(
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
)

function toggleDark() {
  if (typeof document === 'undefined') return
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

defineExpose({ title, smokeInput, smokeError, isDark, validateSmoke, toggleDark })
</script>
