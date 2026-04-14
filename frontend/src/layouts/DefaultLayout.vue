<template>
  <v-app>
    <AppTopbar @toggle-drawer="drawer = !drawer" />
    <AppSidebar v-model="drawer" />
    <v-main>
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import AppSidebar from '../components/AppSidebar.vue'

const drawer = ref(true)
</script>
