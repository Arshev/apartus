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
    <!-- FT-036 P2: PrimeVue global singletons. useConfirm() / useToast()
         composables в views delegate to these. -->
    <ConfirmDialog />
    <Toast position="top-right" />
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import AppSidebar from '../components/AppSidebar.vue'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'

const drawer = ref(true)
</script>
