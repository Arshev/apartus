<template>
  <v-container>
    <v-empty-state
      icon="mdi-tools"
      :title="$t('placeholder.title')"
      :text="$t('placeholder.text', { title })"
    />
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const titles = {
  '/properties': 'Properties',
  '/units': 'Units',
  '/amenities': 'Amenities',
  '/branches': 'Branches',
}

const title = computed(() => titles[route.path] || route.path)
</script>
