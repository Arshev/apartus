<template>
  <DefaultLayout v-if="showLayout" />
  <router-view v-else />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'

const route = useRoute()

const showLayout = computed(() => {
  return !route.meta.guest && !route.meta.widget && route.name !== 'selectOrganization'
})
</script>
