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

const fallbackId = `section-${Math.random().toString(36).slice(2, 10)}`

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
