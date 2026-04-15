<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="5">
        <v-card elevation="4">
          <v-card-title class="text-h5 text-center pa-6">{{ $t('auth.selectOrganization.title') }}</v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="org in authStore.organizations"
                :key="org.id"
                @click="selectOrganization(org)"
                :title="org.name"
                :subtitle="org.role"
                prepend-icon="mdi-domain"
                class="mb-1"
                rounded
              />
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

async function selectOrganization(org) {
  await authStore.switchOrganization(org)
  router.push('/')
}

defineExpose({ selectOrganization })
</script>
