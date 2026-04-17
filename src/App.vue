<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AuthPage from './pages/AuthPage.vue'
import FamilyPage from './pages/FamilyPage.vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const { user, loading } = storeToRefs(authStore)

const currentPath = ref(window.location.pathname)

const syncPath = () => {
  currentPath.value = window.location.pathname
}

onMounted(() => {
  window.addEventListener('popstate', syncPath)
})

onUnmounted(() => {
  window.removeEventListener('popstate', syncPath)
})

const activeView = computed(() => {
  if (loading.value) {
    return 'loading'
  }

  if (!user.value) {
    return 'auth'
  }

  if (currentPath.value === '/dashboard') {
    return 'family'
  }

  return 'family'
})
</script>

<template>
  <p v-if="activeView === 'loading'">Checking session...</p>
  <AuthPage v-else-if="activeView === 'auth'" />
  <FamilyPage v-else />
</template>
