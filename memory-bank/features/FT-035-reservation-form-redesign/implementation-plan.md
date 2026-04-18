---
title: "FT-035 Implementation Plan"
doc_kind: feature
doc_function: plan
purpose: "Step-by-step TDD plan для FT-035 Reservation Form Redesign."
derived_from:
  - ./feature.md
status: active
audience: humans_and_agents
---

# FT-035: Reservation Form Redesign — Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` для выполнения task-by-task. Шаги используют checkbox (`- [ ]`). Fresh branch `feature/ft-035-reservation-form-redesign` уже создан, feature.md committed.

**Goal:** Полный redesign `ReservationFormView` — hybrid layout с sticky price breakdown, date range popup, guest quick-create dialog, per-org currency hookup.

**Architecture:** Extract 4 focused components (`ReservationFormSection`, `ReservationDateRangePicker`, `ReservationPriceSummary`, `GuestQuickCreateDialog`), orchestrator view остаётся < 200 строк. TDD: test-first для каждого компонента, затем orchestrator integration.

**Tech Stack:** Vue 3 Composition API, Vuetify 4, vue-i18n 9, Pinia, Vitest + @vue/test-utils. No TypeScript. Coverage ratchet policy (currently threshold 93).

---

## Pre-requisites

- Branch `feature/ft-035-reservation-form-redesign` (current)
- `feature.md` committed (2 commits: initial + reviewer fixes)
- Baseline test count: `cd frontend && yarn test --run 2>&1 | tail -5` — record before changes
- Artifacts directory: `mkdir -p /Users/artshevko/dev/apartus/artifacts/ft-035/verify/{chk-01,chk-02,chk-05}`

---

## Task 1: Extend test helper stubs for new Vuetify components

**Why first:** Tasks 3+4 tests need stubs для `v-autocomplete`, `v-date-picker`, `v-menu` (activator slot).

**Files:**
- Modify: `frontend/src/__tests__/helpers/mountWithVuetify.js`

- [ ] **Step 1.1: Add stubs**

Replace the existing `v-menu: passthrough('v-menu')` line (line ~29) и add new stubs. Update the `VUETIFY_STUBS` export object:

Find the `'v-menu': passthrough('v-menu'),` entry and replace with:

```js
  'v-menu': {
    name: 'v-menu',
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: `<div data-stub="v-menu">
      <slot name="activator" :props="{ onClick: () => $emit('update:modelValue', true) }" />
      <div v-if="modelValue" data-stub="v-menu-content" role="dialog"><slot /></div>
    </div>`,
  },
```

After `v-select` entry, add:

```js
  'v-autocomplete': {
    name: 'v-autocomplete',
    props: ['modelValue', 'label', 'items', 'itemTitle', 'itemValue', 'rules', 'clearable', 'loading', 'disabled', 'returnObject'],
    emits: ['update:modelValue'],
    template: '<div data-stub="v-autocomplete">{{ label }}</div>',
  },
  'v-date-picker': {
    name: 'v-date-picker',
    props: ['modelValue', 'multiple'],
    emits: ['update:modelValue'],
    template: '<div data-stub="v-date-picker" :data-multiple="multiple"></div>',
  },
```

- [ ] **Step 1.2: Verify no regressions**

Run: `cd frontend && yarn test --run`
Expected: same pass count as baseline (stubs are additive; v-menu now exposes activator slot).

- [ ] **Step 1.3: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/__tests__/helpers/mountWithVuetify.js
git commit -m "$(cat <<'EOF'
FT-035: Extend test stubs for autocomplete/date-picker/menu-activator

Adds stubs needed для новых компонентов FT-035 (DateRangePicker,
guest Autocomplete, GuestQuickCreateDialog).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `getCurrencySymbol` helper — TDD

**Files:**
- Modify: `frontend/src/utils/currency.js`
- Modify: `frontend/src/__tests__/utils/currency.test.js`

- [ ] **Step 2.1: Write failing test**

Append to `frontend/src/__tests__/utils/currency.test.js` (before last closing brace):

```js
import { getCurrencySymbol } from '../../utils/currency'

describe('getCurrencySymbol', () => {
  it('returns symbol for known code', () => {
    expect(getCurrencySymbol('RUB')).toBe('₽')
    expect(getCurrencySymbol('USD')).toBe('$')
    expect(getCurrencySymbol('EUR')).toBe('€')
  })

  it('falls back to $ for unknown code', () => {
    expect(getCurrencySymbol('XYZ')).toBe('$')
  })

  it('falls back to $ for null/undefined', () => {
    expect(getCurrencySymbol(null)).toBe('$')
    expect(getCurrencySymbol(undefined)).toBe('$')
  })
})
```

- [ ] **Step 2.2: Run test — should fail (no export)**

Run: `cd frontend && yarn test --run src/__tests__/utils/currency.test.js`
Expected: FAIL — `getCurrencySymbol is not a function` / import error.

- [ ] **Step 2.3: Implement helper**

Append to `frontend/src/utils/currency.js` (before `CURRENCY_LIST` export):

```js
export function getCurrencySymbol(code) {
  return CURRENCIES[code]?.symbol ?? '$'
}
```

- [ ] **Step 2.4: Run test — should pass**

Run: `cd frontend && yarn test --run src/__tests__/utils/currency.test.js`
Expected: PASS — all 3 new + existing cases green.

- [ ] **Step 2.5: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/utils/currency.js frontend/src/__tests__/utils/currency.test.js
git commit -m "$(cat <<'EOF'
FT-035: Add getCurrencySymbol helper

Accessor над CURRENCIES table с $ fallback. Используется в
ReservationFormView для prefix/suffix у total price input.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `ReservationFormSection.vue` — TDD

**Files:**
- Create: `frontend/src/components/ReservationFormSection.vue`
- Create: `frontend/src/__tests__/components/ReservationFormSection.test.js`

- [ ] **Step 3.1: Write failing test**

Create `frontend/src/__tests__/components/ReservationFormSection.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationFormSection from '../../components/ReservationFormSection.vue'

describe('ReservationFormSection', () => {
  it('renders title in h2 with provided id', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'Юнит и даты', id: 'section-unit' },
      slots: { default: '<p>content</p>' },
    })
    const h2 = wrapper.find('h2')
    expect(h2.exists()).toBe(true)
    expect(h2.text()).toBe('Юнит и даты')
    expect(h2.attributes('id')).toBe('section-unit')
  })

  it('section has aria-labelledby matching heading id', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'Гость', id: 'section-guest' },
      slots: { default: '<span>x</span>' },
    })
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe('section-guest')
  })

  it('renders slot content', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'X', id: 'x' },
      slots: { default: '<div class="slot-content">hi</div>' },
    })
    expect(wrapper.find('.slot-content').text()).toBe('hi')
  })

  it('auto-generates id when not provided', () => {
    const wrapper = mountWithVuetify(ReservationFormSection, {
      props: { title: 'Заметки' },
      slots: { default: ' ' },
    })
    const id = wrapper.find('h2').attributes('id')
    expect(id).toMatch(/^section-/)
    expect(wrapper.find('section').attributes('aria-labelledby')).toBe(id)
  })
})
```

- [ ] **Step 3.2: Run — should fail (component missing)**

Run: `cd frontend && yarn test --run src/__tests__/components/ReservationFormSection.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement component**

Create `frontend/src/components/ReservationFormSection.vue`:

```vue
<template>
  <section :aria-labelledby="resolvedId" class="reservation-section">
    <h2 :id="resolvedId" class="reservation-section__title">{{ title }}</h2>
    <div class="reservation-section__body">
      <slot />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  id: { type: String, default: null },
})

let autoCounter = 0
const fallbackId = `section-${++autoCounter}-${Math.random().toString(36).slice(2, 8)}`

const resolvedId = computed(() => props.id || fallbackId)
</script>

<style scoped>
.reservation-section {
  margin-bottom: 32px;
}
.reservation-section__title {
  font-family: var(--font-display, inherit);
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.3;
  margin: 0 0 16px;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.01em;
}
.reservation-section__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
```

- [ ] **Step 3.4: Run — should pass**

Run: `cd frontend && yarn test --run src/__tests__/components/ReservationFormSection.test.js`
Expected: PASS — 4 tests green.

- [ ] **Step 3.5: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/components/ReservationFormSection.vue frontend/src/__tests__/components/ReservationFormSection.test.js
git commit -m "$(cat <<'EOF'
FT-035: Add ReservationFormSection wrapper

Slot wrapper с Geologica h2 + aria-labelledby для editorial
иерархии формы бронирования. Используется 4× в ReservationFormView.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `GuestQuickCreateDialog.vue` — TDD

**Files:**
- Create: `frontend/src/components/GuestQuickCreateDialog.vue`
- Create: `frontend/src/__tests__/components/GuestQuickCreateDialog.test.js`
- Check: `frontend/src/api/guests.js` (existing `create` function)

- [ ] **Step 4.1: Read existing guest API**

Run: `cat frontend/src/api/guests.js | head -20` — подтвердить что `create(payload)` доступен.
Expected: функция `create` существует и возвращает guest object.

- [ ] **Step 4.2: Write failing test**

Create `frontend/src/__tests__/components/GuestQuickCreateDialog.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import GuestQuickCreateDialog from '../../components/GuestQuickCreateDialog.vue'

vi.mock('../../api/guests', () => ({
  create: vi.fn(),
}))
import * as guestsApi from '../../api/guests'

describe('GuestQuickCreateDialog', () => {
  beforeEach(() => {
    guestsApi.create.mockReset()
  })

  it('opens when modelValue=true', () => {
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    expect(wrapper.find('[data-stub="v-dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('guests.quickCreate.title')
  })

  it('does not emit created when API returns error; keeps dialog open', async () => {
    guestsApi.create.mockRejectedValue({ response: { data: { error: 'Email invalid' } } })
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    wrapper.vm.form.first_name = 'Ivan'
    wrapper.vm.form.last_name = 'Petrov'
    await wrapper.vm.handleSubmit()
    await nextTick()
    expect(wrapper.emitted('created')).toBeFalsy()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.vm.formError).toBe('Email invalid')
  })

  it('emits created with guest и закрывает dialog при success', async () => {
    const guest = { id: 42, first_name: 'Ivan', last_name: 'Petrov', email: '', phone: '' }
    guestsApi.create.mockResolvedValue(guest)
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    wrapper.vm.form.first_name = 'Ivan'
    wrapper.vm.form.last_name = 'Petrov'
    await wrapper.vm.handleSubmit()
    await nextTick()
    expect(wrapper.emitted('created')).toEqual([[guest]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('validates first_name and last_name required', async () => {
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: true },
    })
    // first_name empty, last_name empty
    await wrapper.vm.handleSubmit()
    expect(guestsApi.create).not.toHaveBeenCalled()
    expect(wrapper.vm.formError).toBeTruthy()
  })

  it('resets form when modelValue transitions false → true', async () => {
    const wrapper = mountWithVuetify(GuestQuickCreateDialog, {
      props: { modelValue: false },
    })
    wrapper.vm.form.first_name = 'old'
    await wrapper.setProps({ modelValue: true })
    await nextTick()
    expect(wrapper.vm.form.first_name).toBe('')
  })
})
```

- [ ] **Step 4.3: Run — should fail**

Run: `cd frontend && yarn test --run src/__tests__/components/GuestQuickCreateDialog.test.js`
Expected: FAIL — module not found.

- [ ] **Step 4.4: Implement component**

Create `frontend/src/components/GuestQuickCreateDialog.vue`:

```vue
<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h6">{{ $t('guests.quickCreate.title') }}</v-card-title>
      <v-card-text>
        <v-alert v-if="formError" type="error" class="mb-3" density="compact" closable @click:close="formError = null">
          {{ formError }}
        </v-alert>
        <v-text-field v-model="form.first_name" :label="$t('guests.form.firstName')" :rules="[rules.required]" density="compact" class="mb-2" />
        <v-text-field v-model="form.last_name" :label="$t('guests.form.lastName')" :rules="[rules.required]" density="compact" class="mb-2" />
        <v-text-field v-model="form.email" :label="$t('guests.form.email')" type="email" density="compact" class="mb-2" />
        <v-text-field v-model="form.phone" :label="$t('guests.form.phone')" density="compact" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" :loading="submitting" @click="handleSubmit">{{ $t('common.create') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as guestsApi from '../api/guests'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'created'])

const { t } = useI18n()
const submitting = ref(false)
const formError = ref(null)
const form = ref({ first_name: '', last_name: '', email: '', phone: '' })

const rules = {
  required: (v) => !!v || t('common.validation.required'),
}

function resetForm() {
  form.value = { first_name: '', last_name: '', email: '', phone: '' }
  formError.value = null
}

watch(() => props.modelValue, (opened) => {
  if (opened) resetForm()
})

async function handleSubmit() {
  if (!form.value.first_name || !form.value.last_name) {
    formError.value = t('common.validation.required')
    return
  }
  submitting.value = true
  formError.value = null
  try {
    const guest = await guestsApi.create({ ...form.value })
    emit('created', guest)
    emit('update:modelValue', false)
  } catch (e) {
    formError.value = e?.response?.data?.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

defineExpose({ form, formError, submitting, handleSubmit })
</script>
```

- [ ] **Step 4.5: Run — should pass**

Run: `cd frontend && yarn test --run src/__tests__/components/GuestQuickCreateDialog.test.js`
Expected: PASS — 5 tests green.

Note: `$t('guests.quickCreate.title')` в default i18n fallback returns the key string itself; test asserts on the key. Actual RU/EN text adds in Task 8.

- [ ] **Step 4.6: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/components/GuestQuickCreateDialog.vue frontend/src/__tests__/components/GuestQuickCreateDialog.test.js
git commit -m "$(cat <<'EOF'
FT-035: Add GuestQuickCreateDialog

Compact v-dialog form для inline создания гостя из формы
бронирования. first_name+last_name required, email/phone
опциональны. Emits created(guest) on success, closes dialog.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `ReservationDateRangePicker.vue` — TDD

**Files:**
- Create: `frontend/src/components/ReservationDateRangePicker.vue`
- Create: `frontend/src/__tests__/components/ReservationDateRangePicker.test.js`

- [ ] **Step 5.1: Write failing test**

Create `frontend/src/__tests__/components/ReservationDateRangePicker.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationDateRangePicker from '../../components/ReservationDateRangePicker.vue'

describe('ReservationDateRangePicker', () => {
  it('shows placeholder when no dates', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    expect(wrapper.vm.displayText).toMatch(/picker.placeholder/)
  })

  it('formats range and nights count when both dates set', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-20' } },
    })
    const text = wrapper.vm.displayText
    expect(text).toContain('15')
    expect(text).toContain('20')
    expect(wrapper.vm.nightsCount).toBe(5)
  })

  it('nightsCount is 0 if check_out <= check_in', () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-15' } },
    })
    expect(wrapper.vm.nightsCount).toBe(0)
  })

  it('emits update:modelValue with normalized checkIn/checkOut on range select', async () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    // Simulate v-date-picker emit Date[] for 15..20 inclusive
    const dates = [
      new Date('2026-04-15T00:00:00Z'),
      new Date('2026-04-16T00:00:00Z'),
      new Date('2026-04-17T00:00:00Z'),
      new Date('2026-04-18T00:00:00Z'),
      new Date('2026-04-19T00:00:00Z'),
      new Date('2026-04-20T00:00:00Z'),
    ]
    wrapper.vm.onRangeChange(dates)
    await nextTick()
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ checkIn: '2026-04-15', checkOut: '2026-04-20' })
  })

  it('does not emit when range has < 2 dates (incomplete selection)', async () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '', checkOut: '' } },
    })
    wrapper.vm.onRangeChange([new Date('2026-04-15T00:00:00Z')])
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('popup has role="dialog" when opened', async () => {
    const wrapper = mountWithVuetify(ReservationDateRangePicker, {
      props: { modelValue: { checkIn: '2026-04-15', checkOut: '2026-04-20' } },
    })
    wrapper.vm.menuOpen = true
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 5.2: Run — should fail**

Run: `cd frontend && yarn test --run src/__tests__/components/ReservationDateRangePicker.test.js`
Expected: FAIL — module missing.

- [ ] **Step 5.3: Implement component**

Create `frontend/src/components/ReservationDateRangePicker.vue`:

```vue
<template>
  <v-menu v-model="menuOpen" :close-on-content-click="false">
    <template #activator="{ props: menuProps }">
      <v-text-field
        v-bind="menuProps"
        :model-value="displayText"
        :label="$t('reservations.form.dates')"
        readonly
        prepend-inner-icon="mdi-calendar-range"
        :placeholder="$t('reservations.form.datesPlaceholder')"
      />
    </template>
    <v-date-picker
      :model-value="pickerValue"
      multiple="range"
      @update:model-value="onRangeChange"
    />
  </v-menu>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ checkIn: '', checkOut: '' }),
  },
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const menuOpen = ref(false)

const pickerValue = computed(() => {
  if (!props.modelValue?.checkIn || !props.modelValue?.checkOut) return []
  const start = new Date(props.modelValue.checkIn + 'T00:00:00Z')
  const end = new Date(props.modelValue.checkOut + 'T00:00:00Z')
  const dates = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(new Date(d))
  }
  return dates
})

const nightsCount = computed(() => {
  const { checkIn, checkOut } = props.modelValue || {}
  if (!checkIn || !checkOut) return 0
  const a = new Date(checkIn + 'T00:00:00Z').getTime()
  const b = new Date(checkOut + 'T00:00:00Z').getTime()
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const displayText = computed(() => {
  const { checkIn, checkOut } = props.modelValue || {}
  if (!checkIn || !checkOut) return t('reservations.form.datesPlaceholder')
  const fmt = (iso) => {
    const d = new Date(iso + 'T00:00:00Z')
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }
  return `${fmt(checkIn)} – ${fmt(checkOut)} · ${t('reservations.form.nightsCount', { count: nightsCount.value }, nightsCount.value)}`
})

function toIso(d) {
  return new Date(d).toISOString().slice(0, 10)
}

function onRangeChange(dates) {
  if (!Array.isArray(dates) || dates.length < 2) return
  const sorted = [...dates].sort((a, b) => new Date(a) - new Date(b))
  emit('update:modelValue', {
    checkIn: toIso(sorted[0]),
    checkOut: toIso(sorted[sorted.length - 1]),
  })
  menuOpen.value = false
}

defineExpose({ menuOpen, displayText, nightsCount, onRangeChange, pickerValue })
</script>
```

- [ ] **Step 5.4: Run — should pass**

Run: `cd frontend && yarn test --run src/__tests__/components/ReservationDateRangePicker.test.js`
Expected: PASS — 6 tests green.

- [ ] **Step 5.5: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/components/ReservationDateRangePicker.vue frontend/src/__tests__/components/ReservationDateRangePicker.test.js
git commit -m "$(cat <<'EOF'
FT-035: Add ReservationDateRangePicker

Single readonly text field + v-menu popup с v-date-picker range.
Display: '15 апр – 20 апр · 5 ночей'. Normalizes Date[] emit
от Vuetify в { checkIn, checkOut } ISO strings.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `ReservationPriceSummary.vue` — TDD

**Files:**
- Create: `frontend/src/components/ReservationPriceSummary.vue`
- Create: `frontend/src/__tests__/components/ReservationPriceSummary.test.js`

- [ ] **Step 6.1: Write failing test**

Create `frontend/src/__tests__/components/ReservationPriceSummary.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mountWithVuetify } from '../helpers/mountWithVuetify'
import ReservationPriceSummary from '../../components/ReservationPriceSummary.vue'

const baseProps = {
  checkIn: '2026-04-15',
  checkOut: '2026-04-20',
  unitId: 1,
  basePriceCents: 500000,
  seasonalPrices: [],
  currency: 'RUB',
  autoTotalCents: 2500000,
  manualTotalCents: 2500000,
  manualOverride: false,
}

describe('ReservationPriceSummary', () => {
  it('shows empty state when unitId null', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: { ...baseProps, unitId: null },
    })
    expect(wrapper.text()).toContain('reservations.form.priceSummary.emptyState')
  })

  it('breakdown shows single base bucket when no seasonals apply', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: baseProps,
    })
    expect(wrapper.vm.breakdown).toHaveLength(1)
    expect(wrapper.vm.breakdown[0]).toMatchObject({ nights: 5, priceCents: 500000, seasonal: false })
  })

  it('breakdown shows 2 buckets when seasonal straddles range', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: {
        ...baseProps,
        checkIn: '2026-04-29',
        checkOut: '2026-05-04',
        seasonalPrices: [{ id: 1, start_date: '2026-05-01', end_date: '2026-05-11', price_cents: 700000 }],
        autoTotalCents: 2 * 500000 + 3 * 700000,
        manualTotalCents: 2 * 500000 + 3 * 700000,
      },
    })
    const rows = wrapper.vm.breakdown
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => !r.seasonal)).toMatchObject({ nights: 2, priceCents: 500000 })
    expect(rows.find((r) => r.seasonal)).toMatchObject({ nights: 3, priceCents: 700000 })
  })

  it('shows manual override chip when manualOverride true и суммы отличаются', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        manualTotalCents: 2000000,
        autoTotalCents: 2500000,
      },
    })
    expect(wrapper.text()).toContain('reservations.form.priceSummary.manualPrice')
  })

  it('does not show manual chip when manualOverride true but sums equal', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        manualTotalCents: 2500000,
        autoTotalCents: 2500000,
      },
    })
    expect(wrapper.text()).not.toContain('reservations.form.priceSummary.manualPrice')
  })

  it('emits recalc when button clicked', async () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: {
        ...baseProps,
        manualOverride: true,
        manualTotalCents: 2000000,
        autoTotalCents: 2500000,
      },
    })
    await wrapper.find('[data-testid="recalc-btn"]').trigger('click')
    expect(wrapper.emitted('recalc')).toHaveLength(1)
  })

  it('breakdown is empty when checkOut <= checkIn', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, {
      props: { ...baseProps, checkIn: '2026-04-15', checkOut: '2026-04-15' },
    })
    expect(wrapper.vm.breakdown).toHaveLength(0)
  })

  it('root region has aria-live="polite"', () => {
    const wrapper = mountWithVuetify(ReservationPriceSummary, { props: baseProps })
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true)
  })
})
```

- [ ] **Step 6.2: Run — should fail**

Run: `cd frontend && yarn test --run src/__tests__/components/ReservationPriceSummary.test.js`
Expected: FAIL — module missing.

- [ ] **Step 6.3: Implement component**

Create `frontend/src/components/ReservationPriceSummary.vue`:

```vue
<template>
  <aside class="price-summary" aria-live="polite">
    <h3 class="price-summary__title">{{ $t('reservations.form.priceSummary.title') }}</h3>

    <div v-if="!unitId || !checkIn || !checkOut" class="price-summary__empty">
      {{ $t('reservations.form.priceSummary.emptyState') }}
    </div>

    <template v-else-if="breakdown.length === 0">
      <div class="price-summary__empty">{{ $t('reservations.form.priceSummary.errorState') }}</div>
    </template>

    <template v-else>
      <div class="price-summary__dates">
        {{ dateRangeText }}
      </div>

      <ul class="price-summary__rows">
        <li v-for="(row, i) in breakdown" :key="i" class="price-summary__row">
          <span>
            {{ row.nights }} × {{ formatMoney(row.priceCents, currency) }}
            <span v-if="row.seasonal" class="price-summary__seasonal-tag">
              ({{ $t('reservations.form.priceSummary.seasonalLabel') }})
            </span>
          </span>
          <span>{{ formatMoney(row.nights * row.priceCents, currency) }}</span>
        </li>
      </ul>

      <div class="price-summary__divider" />

      <div class="price-summary__total">
        <span>{{ $t('reservations.form.priceSummary.total') }}</span>
        <strong>{{ formatMoney(effectiveTotal, currency) }}</strong>
      </div>

      <div v-if="manualOverride && diff !== 0" class="price-summary__manual">
        <v-chip color="warning" size="small" variant="tonal">
          {{ $t('reservations.form.priceSummary.manualPrice', { diff: formatMoney(Math.abs(diff), currency), sign: diff < 0 ? '−' : '+' }) }}
        </v-chip>
        <v-btn data-testid="recalc-btn" variant="text" size="small" @click="$emit('recalc')">
          {{ $t('reservations.form.priceSummary.recalc') }}
        </v-btn>
      </div>
    </template>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatMoney } from '../utils/currency'

const props = defineProps({
  checkIn: { type: String, default: '' },
  checkOut: { type: String, default: '' },
  unitId: { type: [Number, String, null], default: null },
  basePriceCents: { type: Number, default: 0 },
  seasonalPrices: { type: Array, default: () => [] },
  currency: { type: String, default: 'RUB' },
  autoTotalCents: { type: Number, default: 0 },
  manualTotalCents: { type: Number, default: 0 },
  manualOverride: { type: Boolean, default: false },
})
defineEmits(['recalc'])

const { t } = useI18n()

const breakdown = computed(() => {
  if (!props.checkIn || !props.checkOut) return []
  const start = new Date(props.checkIn + 'T00:00:00Z')
  const end = new Date(props.checkOut + 'T00:00:00Z')
  if (end <= start) return []

  const buckets = new Map()
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ds = d.toISOString().slice(0, 10)
    const sp = props.seasonalPrices.find((s) => ds >= s.start_date && ds < s.end_date)
    const priceCents = sp ? sp.price_cents : props.basePriceCents
    const key = sp ? `s:${sp.id}:${priceCents}` : `b:${priceCents}`
    const prev = buckets.get(key)
    buckets.set(key, {
      priceCents,
      seasonal: !!sp,
      nights: (prev?.nights || 0) + 1,
    })
  }
  return [...buckets.values()]
})

const nightsCount = computed(() => breakdown.value.reduce((n, r) => n + r.nights, 0))

const dateRangeText = computed(() => {
  const fmt = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${fmt(props.checkIn)} – ${fmt(props.checkOut)} · ${t('reservations.form.nightsCount', { count: nightsCount.value }, nightsCount.value)}`
})

const effectiveTotal = computed(() =>
  props.manualOverride ? props.manualTotalCents : props.autoTotalCents,
)

const diff = computed(() => props.manualTotalCents - props.autoTotalCents)

defineExpose({ breakdown, nightsCount, diff, effectiveTotal })
</script>

<style scoped>
.price-summary {
  position: sticky;
  top: 80px;
  padding: 20px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.price-summary__title {
  font-family: var(--font-display, inherit);
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.price-summary__empty {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.875rem;
}
.price-summary__dates {
  font-size: 0.9rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
.price-summary__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.price-summary__row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  gap: 12px;
}
.price-summary__seasonal-tag {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.75rem;
}
.price-summary__divider {
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  margin: 4px 0;
}
.price-summary__total {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
}
.price-summary__total strong {
  font-family: var(--font-display, inherit);
  font-weight: 500;
  font-size: 1.25rem;
}
.price-summary__manual {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

@media (max-width: 959px) {
  .price-summary {
    position: static;
  }
}
</style>
```

- [ ] **Step 6.4: Run — should pass**

Run: `cd frontend && yarn test --run src/__tests__/components/ReservationPriceSummary.test.js`
Expected: PASS — 8 tests green.

- [ ] **Step 6.5: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/components/ReservationPriceSummary.vue frontend/src/__tests__/components/ReservationPriceSummary.test.js
git commit -m "$(cat <<'EOF'
FT-035: Add ReservationPriceSummary

Sticky price breakdown panel — bucketed rows (base vs seasonal),
total, manual-override diff chip + recalc button. Pure display,
pure function breakdown computed — parent владеет manualOverride
state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Add i18n keys (ru + en)

**Files:**
- Modify: `frontend/src/locales/ru.json`
- Modify: `frontend/src/locales/en.json`

- [ ] **Step 7.1: Review existing structure**

Run: `cat frontend/src/locales/ru.json | head -120`
Check: existing `reservations.form.*` keys, `guests.*` structure.

- [ ] **Step 7.2: Add RU keys**

In `frontend/src/locales/ru.json`, under `reservations.form`, add (merge, don't replace):

```json
"dates": "Даты",
"datesPlaceholder": "Выберите даты",
"nightsCount": "{count} ночь | {count} ночи | {count} ночей",
"priceSummary": {
  "title": "Расчёт",
  "emptyState": "Выберите юнит и даты",
  "errorState": "Ошибка расчёта",
  "seasonalLabel": "сезон",
  "total": "Итого",
  "manualPrice": "Ручная цена, {sign}{diff}",
  "recalc": "Пересчитать"
},
"sections": {
  "unitDates": "Юнит и даты",
  "guest": "Гость",
  "pricing": "Цена",
  "notes": "Заметки"
},
"addGuest": "Новый гость",
"guestsCount": "Гостей",
"totalPrice": "Общая стоимость"
```

Under `guests`, add:

```json
"quickCreate": {
  "title": "Новый гость"
}
```

- [ ] **Step 7.3: Add EN keys (parity)**

In `frontend/src/locales/en.json`, under `reservations.form`:

```json
"dates": "Dates",
"datesPlaceholder": "Select dates",
"nightsCount": "{count} night | {count} nights",
"priceSummary": {
  "title": "Breakdown",
  "emptyState": "Select unit and dates",
  "errorState": "Calculation error",
  "seasonalLabel": "seasonal",
  "total": "Total",
  "manualPrice": "Manual price, {sign}{diff}",
  "recalc": "Recalculate"
},
"sections": {
  "unitDates": "Unit & dates",
  "guest": "Guest",
  "pricing": "Price",
  "notes": "Notes"
},
"addGuest": "New guest",
"guestsCount": "Guests",
"totalPrice": "Total price"
```

Under `guests`:

```json
"quickCreate": {
  "title": "New guest"
}
```

- [ ] **Step 7.4: Verify parity**

Run: `cd frontend && node -e "const r=require('./src/locales/ru.json'), e=require('./src/locales/en.json'); const keys = (o, p='') => Object.keys(o).flatMap(k => typeof o[k]==='object'?keys(o[k], p+k+'.'):[p+k]); const rk=keys(r), ek=keys(e); console.log('RU only:', rk.filter(k=>!ek.includes(k))); console.log('EN only:', ek.filter(k=>!rk.includes(k)))"`
Expected: both lists empty (full parity).

- [ ] **Step 7.5: Run tests**

Run: `cd frontend && yarn test --run`
Expected: all prior component tests still green. New i18n keys available в form tests.

- [ ] **Step 7.6: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/locales/ru.json frontend/src/locales/en.json
git commit -m "$(cat <<'EOF'
FT-035: Add i18n keys для redesigned reservation form

reservations.form.{dates,datesPlaceholder,nightsCount,priceSummary.*,
sections.*,addGuest,guestsCount,totalPrice} + guests.quickCreate.title.
Parity verified between ru + en.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Refactor `ReservationFormView.vue` — orchestrator rewrite

**Files:**
- Modify: `frontend/src/views/ReservationFormView.vue`
- Modify: `frontend/src/__tests__/views/ReservationFormView.test.js`

This is the biggest task. Split into sub-steps.

- [ ] **Step 8.1: Read current test file**

Run: `wc -l frontend/src/__tests__/views/ReservationFormView.test.js && head -80 frontend/src/__tests__/views/ReservationFormView.test.js`
Record existing test patterns and mocks used.

- [ ] **Step 8.2: Write new/expanded test cases (failing)**

Rewrite `frontend/src/__tests__/views/ReservationFormView.test.js` — preserve existing mocks for `allUnitsApi`, `guestsApi`, `reservationsApi`, `seasonalPricesApi`, but update assertions:

Replace the test file with:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mountWithVuetifyAsync } from '../helpers/mountWithVuetify'
import ReservationFormView from '../../views/ReservationFormView.vue'

vi.mock('../../api/allUnits', () => ({
  list: vi.fn(() => Promise.resolve([
    { id: 1, name: 'Room 1', property_name: 'Villa A', base_price_cents: 500000 },
    { id: 2, name: 'Room 2', property_name: 'Villa A', base_price_cents: 700000 },
  ])),
}))
vi.mock('../../api/guests', () => ({
  list: vi.fn(() => Promise.resolve([
    { id: 10, first_name: 'Ivan', last_name: 'Petrov' },
  ])),
  create: vi.fn(),
}))
vi.mock('../../api/reservations', () => ({
  get: vi.fn(),
}))
vi.mock('../../api/seasonalPrices', () => ({
  list: vi.fn(() => Promise.resolve([])),
}))

import * as reservationsApi from '../../api/reservations'
import * as guestsApi from '../../api/guests'

describe('ReservationFormView', () => {
  beforeEach(() => {
    guestsApi.create.mockReset()
    reservationsApi.get.mockReset()
  })

  const routes = [
    { path: '/reservations', component: { template: '<div/>' } },
    { path: '/reservations/new', name: 'reservation-new', component: { template: '<div/>' } },
    { path: '/reservations/:id/edit', name: 'reservation-edit', component: { template: '<div/>' } },
  ]

  it('loads units and guests on mount', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    await nextTick()
    await nextTick()
    expect(wrapper.vm.units).toHaveLength(2)
    expect(wrapper.vm.guests).toHaveLength(1)
  })

  it('form.total_price_cents is cents (not units)', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    expect('total_price_cents' in wrapper.vm.form).toBe(true)
    expect('total_price_rub' in wrapper.vm.form).toBe(false)
  })

  it('prefills total_price_cents directly from API in edit mode (no /100)', async () => {
    reservationsApi.get.mockResolvedValue({
      id: 42, unit_id: 1, guest_id: 10,
      check_in: '2026-04-15', check_out: '2026-04-20',
      guests_count: 2, total_price_cents: 2500000, notes: 'vip',
    })
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, {
      routes, initialRoute: '/reservations/42/edit',
    })
    await nextTick(); await nextTick(); await nextTick()
    expect(wrapper.vm.form.total_price_cents).toBe(2500000)
    expect(wrapper.vm.manualOverride).toBe(true)
  })

  it('sets manualOverride=true when total input edited', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    expect(wrapper.vm.manualOverride).toBe(false)
    wrapper.vm.onTotalInput()
    expect(wrapper.vm.manualOverride).toBe(true)
  })

  it('recalc handler resets manualOverride', () => {
    const wrapper = mountWithVuetify_OMIT_ROUTE_HERE
    // placeholder — will use mountWithVuetifyAsync below instead in real test
  })

  it('guest dialog create → appends to guests and selects', async () => {
    guestsApi.create.mockResolvedValue({ id: 99, first_name: 'New', last_name: 'Guest' })
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    await nextTick(); await nextTick()
    wrapper.vm.onGuestCreated({ id: 99, first_name: 'New', last_name: 'Guest' })
    await nextTick()
    expect(wrapper.vm.guests.some((g) => g.id === 99)).toBe(true)
    expect(wrapper.vm.form.guest_id).toBe(99)
    expect(wrapper.vm.guestDialogOpen).toBe(false)
  })

  it('submit payload uses total_price_cents (not total_price_rub)', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    await nextTick(); await nextTick()
    wrapper.vm.form.unit_id = 1
    wrapper.vm.form.check_in = '2026-04-15'
    wrapper.vm.form.check_out = '2026-04-20'
    wrapper.vm.form.guests_count = 2
    wrapper.vm.form.total_price_cents = 2500000
    wrapper.vm.form.notes = ''

    const payload = wrapper.vm.buildPayload()
    expect(payload.total_price_cents).toBe(2500000)
    expect(payload.total_price_rub).toBeUndefined()
  })

  it('currency resolves from authStore.organization', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    // authStore.organization not set → fallback RUB
    expect(wrapper.vm.currency).toBe('RUB')
  })

  it('each form section has aria-labelledby', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    await nextTick(); await nextTick()
    const sections = wrapper.findAll('section[aria-labelledby]')
    expect(sections.length).toBeGreaterThanOrEqual(4)
  })
})
```

Remove the `mountWithVuetify_OMIT_ROUTE_HERE` placeholder — replace that `it` block with:

```js
  it('recalc handler resets manualOverride and triggers recalc', async () => {
    const wrapper = await mountWithVuetifyAsync(ReservationFormView, { routes, initialRoute: '/reservations/new' })
    await nextTick(); await nextTick()
    wrapper.vm.manualOverride = true
    wrapper.vm.onRecalc()
    expect(wrapper.vm.manualOverride).toBe(false)
  })
```

- [ ] **Step 8.3: Run — should fail**

Run: `cd frontend && yarn test --run src/__tests__/views/ReservationFormView.test.js`
Expected: FAIL на новых assertions (form shape, manualOverride, buildPayload и т.д.).

- [ ] **Step 8.4: Rewrite `ReservationFormView.vue`**

Replace the entire contents of `frontend/src/views/ReservationFormView.vue`:

```vue
<template>
  <v-container class="reservation-form-container">
    <h1 class="reservation-form-container__heading">
      {{ isEdit ? $t('reservations.editTitle') : $t('reservations.createTitle') }}
    </h1>

    <v-alert v-if="formError" type="error" class="mb-4" closable @click:close="formError = null">
      {{ Array.isArray(formError) ? formError.join(', ') : formError }}
    </v-alert>

    <div class="reservation-form-grid">
      <v-form ref="formRef" class="reservation-form-grid__form" @submit.prevent="handleSubmit" :disabled="submitting">
        <ReservationFormSection id="section-unit-dates" :title="$t('reservations.form.sections.unitDates')">
          <v-autocomplete
            v-model="form.unit_id"
            :label="$t('reservations.form.unit')"
            :items="units"
            item-title="label"
            item-value="id"
            :rules="[rules.required]"
            :disabled="isEdit"
          />
          <ReservationDateRangePicker v-model="dateRange" />
        </ReservationFormSection>

        <ReservationFormSection id="section-guest" :title="$t('reservations.form.sections.guest')">
          <div class="d-flex align-center ga-2">
            <v-autocomplete
              v-model="form.guest_id"
              :label="$t('reservations.form.guest')"
              :items="guests"
              item-title="label"
              item-value="id"
              clearable
              style="flex: 1"
            />
            <v-btn icon="mdi-plus" variant="tonal" size="small" :title="$t('reservations.form.addGuest')" @click="guestDialogOpen = true" />
          </div>
        </ReservationFormSection>

        <ReservationFormSection id="section-pricing" :title="$t('reservations.form.sections.pricing')">
          <v-text-field
            :model-value="totalPriceUnits"
            :label="$t('reservations.form.totalPrice')"
            type="number"
            step="0.01"
            :prefix="currencyConfig.position === 'before' ? currencyConfig.symbol : ''"
            :suffix="currencyConfig.position === 'after' ? currencyConfig.symbol : ''"
            @update:model-value="onTotalInput"
          />
          <v-text-field
            v-model.number="form.guests_count"
            :label="$t('reservations.form.guestsCount')"
            type="number"
            :rules="[rules.required, rules.minOne]"
          />
        </ReservationFormSection>

        <ReservationFormSection id="section-notes" :title="$t('reservations.form.sections.notes')">
          <v-textarea v-model="form.notes" :label="$t('common.form.notes')" rows="3" />
        </ReservationFormSection>

        <div class="d-flex ga-2">
          <v-btn type="submit" color="primary" :loading="submitting">
            {{ isEdit ? $t('common.save') : $t('common.create') }}
          </v-btn>
          <v-btn variant="text" :to="'/reservations'">{{ $t('common.cancel') }}</v-btn>
        </div>
      </v-form>

      <aside class="reservation-form-grid__summary">
        <ReservationPriceSummary
          :check-in="form.check_in"
          :check-out="form.check_out"
          :unit-id="form.unit_id"
          :base-price-cents="activeUnitBaseCents"
          :seasonal-prices="activeSeasonalPrices"
          :currency="currency"
          :auto-total-cents="autoTotalCents"
          :manual-total-cents="form.total_price_cents"
          :manual-override="manualOverride"
          @recalc="onRecalc"
        />
      </aside>
    </div>

    <GuestQuickCreateDialog v-model="guestDialogOpen" @created="onGuestCreated" />
  </v-container>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useReservationsStore } from '../stores/reservations'
import { useAuthStore } from '../stores/auth'
import * as reservationsApi from '../api/reservations'
import * as allUnitsApi from '../api/allUnits'
import * as guestsApi from '../api/guests'
import * as seasonalPricesApi from '../api/seasonalPrices'
import { centsToUnits, unitsToCents, getCurrencySymbol } from '../utils/currency'
import ReservationFormSection from '../components/ReservationFormSection.vue'
import ReservationDateRangePicker from '../components/ReservationDateRangePicker.vue'
import ReservationPriceSummary from '../components/ReservationPriceSummary.vue'
import GuestQuickCreateDialog from '../components/GuestQuickCreateDialog.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useReservationsStore()
const authStore = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const submitting = ref(false)
const formError = ref(null)
const manualOverride = ref(false)
const guestDialogOpen = ref(false)

const form = ref({
  unit_id: null,
  guest_id: null,
  check_in: '',
  check_out: '',
  guests_count: 1,
  total_price_cents: 0,
  notes: '',
})

const units = ref([])
const unitDataMap = ref({})
const guests = ref([])

const currency = computed(() => authStore.organization?.currency || 'RUB')
const currencyConfig = computed(() => {
  const symbol = getCurrencySymbol(currency.value)
  // position mirrors CURRENCIES table; simplistic lookup via symbol presence
  const before = ['$', '€', '£', 'Rp', '₺']
  return { symbol, position: before.includes(symbol) ? 'before' : 'after' }
})

const activeUnit = computed(() => units.value.find((u) => u.id === form.value.unit_id) || null)
const activeUnitBaseCents = computed(() => activeUnit.value?.base_price_cents || 0)
const activeSeasonalPrices = computed(() => unitDataMap.value[form.value.unit_id]?.seasonal_prices || [])

const totalPriceUnits = computed(() => centsToUnits(form.value.total_price_cents || 0))

const dateRange = computed({
  get: () => ({ checkIn: form.value.check_in, checkOut: form.value.check_out }),
  set: (val) => {
    form.value.check_in = val?.checkIn || ''
    form.value.check_out = val?.checkOut || ''
  },
})

// Auto-calculated total based on unit + seasonal + date range
const autoTotalCents = computed(() => {
  const { check_in, check_out, unit_id } = form.value
  if (!unit_id || !check_in || !check_out) return 0
  const basePrice = activeUnitBaseCents.value
  const seasonals = activeSeasonalPrices.value
  const start = new Date(check_in + 'T00:00:00Z')
  const end = new Date(check_out + 'T00:00:00Z')
  if (end <= start) return 0
  let total = 0
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ds = d.toISOString().slice(0, 10)
    const sp = seasonals.find((s) => ds >= s.start_date && ds < s.end_date)
    total += sp ? sp.price_cents : basePrice
  }
  return total
})

const rules = {
  required: (v) => (v !== '' && v !== null && v !== undefined) || t('common.validation.required'),
  minOne: (v) => Number(v) >= 1 || t('common.validation.minOne'),
}

function onTotalInput(value) {
  manualOverride.value = true
  form.value.total_price_cents = unitsToCents(Number(value) || 0)
}

function onRecalc() {
  manualOverride.value = false
  form.value.total_price_cents = autoTotalCents.value
}

function onGuestCreated(guest) {
  guests.value = [
    ...guests.value,
    { id: guest.id, label: `${guest.first_name} ${guest.last_name}` },
  ]
  form.value.guest_id = guest.id
  guestDialogOpen.value = false
}

function buildPayload() {
  return {
    unit_id: form.value.unit_id,
    guest_id: form.value.guest_id,
    check_in: form.value.check_in,
    check_out: form.value.check_out,
    guests_count: form.value.guests_count,
    total_price_cents: form.value.total_price_cents,
    notes: form.value.notes,
  }
}

// Load seasonal prices for a unit on demand and cache.
async function ensureUnitData(unitId) {
  if (unitDataMap.value[unitId]) return
  try {
    const sp = await seasonalPricesApi.list(unitId)
    unitDataMap.value[unitId] = { seasonal_prices: sp || [] }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('Seasonal prices load failed:', e)
    unitDataMap.value[unitId] = { seasonal_prices: [] }
  }
}

// Watcher: fetch seasonals; auto-recalc total только если НЕ manualOverride.
watch(
  () => [form.value.unit_id, form.value.check_in, form.value.check_out],
  async ([unitId, ci, co], [prevUnitId]) => {
    if (unitId && prevUnitId != null && unitId !== prevUnitId) {
      manualOverride.value = false
    }
    if (!unitId || !ci || !co) return
    await ensureUnitData(unitId)
    if (!manualOverride.value) {
      form.value.total_price_cents = autoTotalCents.value
    }
  },
)

async function loadSelectors() {
  try {
    const [unitsList, gList] = await Promise.all([allUnitsApi.list(), guestsApi.list()])
    units.value = unitsList.map((u) => ({
      id: u.id,
      label: `${u.property_name} → ${u.name}`,
      base_price_cents: u.base_price_cents || 0,
    }))
    guests.value = gList.map((g) => ({ id: g.id, label: `${g.first_name} ${g.last_name}` }))
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('reservations.messages.formLoadError')
  }
}

async function loadReservation() {
  if (!isEdit.value) return
  try {
    const r = await reservationsApi.get(route.params.id)
    form.value = {
      unit_id: r.unit_id,
      guest_id: r.guest_id,
      check_in: r.check_in,
      check_out: r.check_out,
      guests_count: r.guests_count,
      total_price_cents: r.total_price_cents || 0,
      notes: r.notes || '',
    }
    manualOverride.value = true
    if (r.unit_id) await ensureUnitData(r.unit_id)
  } catch (e) {
    if (import.meta.env.DEV) console.error(e)
    formError.value = t('reservations.messages.loadError')
  }
}

async function handleSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  submitting.value = true
  formError.value = null
  try {
    if (isEdit.value) {
      await store.update(Number(route.params.id), buildPayload())
    } else {
      await store.create(buildPayload())
    }
    router.push('/reservations')
  } catch (e) {
    formError.value = e.response?.data?.error || store.error || t('common.messages.saveError')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadSelectors()
  loadReservation()
})

defineExpose({
  form, formError, handleSubmit, isEdit, rules, submitting, units, guests,
  manualOverride, guestDialogOpen, currency, autoTotalCents,
  onTotalInput, onRecalc, onGuestCreated, buildPayload,
  loadSelectors, loadReservation,
})
</script>

<style scoped>
.reservation-form-container {
  max-width: 1200px;
}
.reservation-form-container__heading {
  font-family: var(--font-display, inherit);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
  color: rgb(var(--v-theme-on-surface));
}
.reservation-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 32px;
  align-items: start;
}
.reservation-form-grid__form {
  min-width: 0;
}
.reservation-form-grid__summary {
  position: relative;
}

@media (max-width: 959px) {
  .reservation-form-grid {
    grid-template-columns: 1fr;
  }
  .reservation-form-grid__summary {
    order: -1;
  }
}
</style>
```

- [ ] **Step 8.5: Run view tests**

Run: `cd frontend && yarn test --run src/__tests__/views/ReservationFormView.test.js`
Expected: all new + existing tests PASS.

Если test-case about `buildPayload` fails because функция не exposed — добавить в `defineExpose`. Already exposed in template above.

- [ ] **Step 8.6: Run full test suite**

Run: `cd frontend && yarn test --run`
Expected: all tests green (baseline + ~18 new tests from Tasks 3–8).

- [ ] **Step 8.7: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add frontend/src/views/ReservationFormView.vue frontend/src/__tests__/views/ReservationFormView.test.js
git commit -m "$(cat <<'EOF'
FT-035: Rewire ReservationFormView to hybrid layout

Orchestrator теперь составляется из 4 extracted components:
ReservationFormSection, ReservationDateRangePicker,
ReservationPriceSummary, GuestQuickCreateDialog.

- total_price_rub → total_price_cents (cents SSoT)
- per-org currency prefix/suffix via authStore
- manualOverride ref + Пересчитать flow
- Grid layout 2-col wide + single-col narrow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Coverage ratchet + manual QA + delivery done

- [ ] **Step 9.1: Run coverage**

Run: `cd frontend && yarn test:coverage --run 2>&1 | tee ../artifacts/ft-035/verify/chk-01/coverage.log | tail -30`
Expected: threshold 93 met; record actual line %.

If actual > threshold + 1, bump threshold per ratchet policy:

```bash
# Only if actual ≥ 94 and previous threshold was 93:
# Edit frontend/vitest.config.js: lines: 93 → floor(actual)-1
```

- [ ] **Step 9.2: Run linter**

Run: `cd frontend && yarn lint 2>&1 | tail -20`
Expected: 0 errors (warnings acceptable if pre-existing).

- [ ] **Step 9.3: Manual QA — light + dark**

Run dev server: `cd frontend && yarn dev &` wait for ready.

Manual checklist (record screenshots → `artifacts/ft-035/verify/chk-05/`):
- [ ] `/reservations/new` — hero heading Geologica visible
- [ ] 4 sections stacked на narrow, 2-col grid на wide
- [ ] Unit autocomplete type-to-filter работает
- [ ] Date picker popup opens, range select, nights count updates
- [ ] Price breakdown appears после unit+dates selected
- [ ] Seasonal row tagged `(сезон)` if applicable
- [ ] Manual total edit → chip visible, Пересчитать reverts
- [ ] Guest dialog open, submit creates + selects
- [ ] Submit new reservation → redirect `/reservations`
- [ ] Edit existing reservation → form prefilled with cents, dates change doesn't auto-recalc
- [ ] Dark mode: theme toggle → all colors readable
- [ ] Non-RUB currency: switch in Settings → reservation form shows $ / € accordingly

Kill dev server: `pkill -f "yarn dev"`

- [ ] **Step 9.4: Update feature delivery_status**

Edit `memory-bank/features/FT-035-reservation-form-redesign/feature.md` frontmatter:

```yaml
delivery_status: done
```

Edit `memory-bank/features/README.md`:

```
| [FT-035-reservation-form-redesign](FT-035-reservation-form-redesign/feature.md) | active | done | Reservation form redesign ...
```

- [ ] **Step 9.5: Commit**

```bash
cd /Users/artshevko/dev/apartus
git add memory-bank/features/FT-035-reservation-form-redesign/feature.md memory-bank/features/README.md
git commit -m "$(cat <<'EOF'
FT-035: Mark delivery_status=done

All EC-01..07 met, coverage ratchet maintained.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 9.6: Push + open PR**

```bash
cd /Users/artshevko/dev/apartus
git push -u origin feature/ft-035-reservation-form-redesign
gh pr create --title "FT-035: Reservation form redesign" --body "$(cat <<'EOF'
## Summary
- Hybrid 2-col layout с sticky price breakdown; single-col на narrow viewport
- 4 extracted components: ReservationFormSection, ReservationDateRangePicker, ReservationPriceSummary, GuestQuickCreateDialog
- Per-org currency hookup — `total_price_cents` SSoT, `$/€/₽/...` prefix/suffix via authStore
- Manual override lock + Пересчитать flow для scenarios со скидками/комп-стэями
- Guest quick-create dialog — no более context-switch на `/guests/new`
- i18n RU + EN parity; full a11y (aria-labelledby, aria-live, role="dialog")

Closes FT-015 RUB-hardcoded debt + AI-slop flat-form critique.

## Test plan
- [x] New component tests (FormSection, DateRangePicker, PriceSummary, QuickCreateDialog) — all green
- [x] Expanded ReservationFormView tests — prefill cents, manual override, guest dialog, currency, a11y
- [x] Full suite green; coverage ratchet met
- [x] Manual QA light+dark, narrow viewport, non-RUB currency
- [x] i18n parity verified

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

**Spec coverage:**

- REQ-01 hybrid layout → Task 8 (`.reservation-form-grid` CSS + media query)
- REQ-02 editorial sections → Task 3 (`ReservationFormSection`)
- REQ-03 date range popup → Task 5 (`ReservationDateRangePicker`)
- REQ-04 price breakdown panel → Task 6 (`ReservationPriceSummary`, включая diff chip)
- REQ-05 guest dialog → Task 4 (`GuestQuickCreateDialog`)
- REQ-06 autocomplete → Task 8 (`v-autocomplete` × 2)
- REQ-07 currency hookup → Task 2 (`getCurrencySymbol`) + Task 8 (prefix/suffix + cents SSoT)
- REQ-08 manual override lock → Task 8 (`manualOverride` ref, `onTotalInput`, `onRecalc`)
- REQ-09 edit prefill — `manualOverride = true` initially → Task 8 (`loadReservation`)
- REQ-10 nights counter → Task 5 (`nightsCount` computed) + Task 7 (i18n pluralized)
- REQ-11 validation → Task 8 (rules + `formRef.validate()`)
- REQ-12 i18n parity → Task 7
- REQ-13 a11y — aria-labelledby, aria-live, role=dialog → Tasks 3, 5, 6, 8
- REQ-14 dark mode → scoped styles use `rgb(var(--v-theme-*))` tokens — inherently dark-aware
- REQ-15 tests → Tasks 3–6, 8
- REQ-16 coverage ratchet → Task 9

**Placeholder scan:** один placeholder был в Task 8 test draft (`mountWithVuetify_OMIT_ROUTE_HERE`), replaced с real test.

**Type consistency:**
- `form.total_price_cents` (cents int) везде — консистентно
- `{ checkIn, checkOut }` в DateRangePicker v-model object — консистентно
- `manualOverride`, `autoTotalCents`, `manualTotalCents` — consistent naming
- `onGuestCreated`, `onRecalc`, `onTotalInput` — consistent naming
- `guestDialogOpen` — consistent flag

**Gaps:** none identified. Plan ready for execution.
