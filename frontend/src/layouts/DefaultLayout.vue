<template>
  <div class="app-shell">
    <AppTopbar class="app-shell__topbar" @toggle-drawer="drawer = !drawer" />
    <AppSidebar v-model="drawer" class="app-shell__sidebar" />
    <main :class="['app-shell__main', { 'app-shell__main--drawer-open': drawer }]">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <!-- FT-036 P2: PrimeVue global singletons. -->
    <ConfirmDialog />
    <Toast position="top-right" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppTopbar from '../components/AppTopbar.vue'
import AppSidebar from '../components/AppSidebar.vue'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'

const drawer = ref(true)
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: var(--p-surface-50, #fafdfa);
  color: var(--p-surface-900, #171c19);
}

:where(.dark) .app-shell {
  background: var(--p-surface-950, #091111);
  color: var(--p-surface-0, #e1e6e2);
}

.app-shell__topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 20;
}

.app-shell__sidebar {
  position: fixed;
  top: 64px;
  left: 0;
  bottom: 0;
  width: 256px;
  z-index: 10;
  transform: translateX(0);
  transition: transform 0.2s ease-out;
}

.app-shell__main {
  padding-top: 64px;
  margin-left: 0;
  transition: margin-left 0.2s ease-out;
}

@media (min-width: 960px) {
  .app-shell__main--drawer-open {
    margin-left: 256px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell__sidebar,
  .app-shell__main {
    transition: none;
  }
}

@media (max-width: 959px) {
  .app-shell__sidebar {
    transform: translateX(-100%);
  }
  .app-shell__sidebar[data-open="true"] {
    transform: translateX(0);
  }
}
</style>
