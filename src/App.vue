<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AuthPage from './pages/AuthPage.vue'
import FamilyPage from './pages/FamilyPage.vue'

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

const showFamilyPage = computed(() => currentPath.value === '/dashboard')
</script>

<template>
  <FamilyPage v-if="showFamilyPage" />
  <AuthPage v-else />
</template>
