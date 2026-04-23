<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import authService from '../services/authService'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const { user, loading: authLoading } = storeToRefs(authStore)

const isLoginMode = ref(true)
const email = ref('')
const password = ref('')
const submitLoading = ref(false)
const errorMessage = ref('')

const modeTitle = computed(() => (isLoginMode.value ? 'Login' : 'Create account'))
const submitLabel = computed(() => (submitLoading.value
  ? (isLoginMode.value ? 'Logging in...' : 'Creating account...')
  : (isLoginMode.value ? 'Login' : 'Register')))

const router = useRouter()
const hasRedirected = ref(false)

const redirectToPostAuth = () => {
  if (hasRedirected.value) {
    return
  }

  hasRedirected.value = true
  router.replace('/dashboard')
}

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  errorMessage.value = ''
}

const handleSubmit = async () => {
  if (submitLoading.value || authLoading.value) {
    return
  }

  errorMessage.value = ''
  submitLoading.value = true

  const action = isLoginMode.value ? authService.login : authService.register
  const { error } = await action(email.value.trim(), password.value)

  submitLoading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  redirectToPostAuth()
}

watch(
  [user, authLoading],
  ([currentUser, isAuthLoading]) => {
    if (!isAuthLoading && currentUser) {
      redirectToPostAuth()
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-8">
    <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ modeTitle }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        {{ isLoginMode ? 'Sign in to continue.' : 'Create an account to get started.' }}
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-1.5">
          <label for="email" class="text-sm font-medium text-slate-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
            :disabled="submitLoading || authLoading"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4"
          />
        </div>

        <div class="space-y-1.5">
          <label for="password" class="text-sm font-medium text-slate-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
            minlength="6"
            :disabled="submitLoading || authLoading"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4"
          />
        </div>

        <p v-if="authLoading && !submitLoading" class="text-sm text-emerald-700">Checking session...</p>
        <p v-if="errorMessage" class="text-sm text-rose-600">{{ errorMessage }}</p>

        <button
          type="submit"
          :disabled="submitLoading || authLoading"
          class="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ submitLabel }}
        </button>
      </form>

      <button
        type="button"
        class="mt-4 w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="submitLoading || authLoading"
        @click="toggleMode"
      >
        {{ isLoginMode ? 'Need an account? Register' : 'Already have an account? Login' }}
      </button>
    </section>
  </main>
</template>
