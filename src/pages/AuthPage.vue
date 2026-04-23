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
  <main class="auth-page">
    <section class="auth-card">
      <h1>{{ modeTitle }}</h1>
      <p class="subtitle">
        {{ isLoginMode ? 'Sign in to continue.' : 'Create an account to get started.' }}
      </p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
          :disabled="submitLoading || authLoading"
        />

        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
          minlength="6"
          :disabled="submitLoading || authLoading"
        />

        <p v-if="authLoading && !submitLoading" class="status">Checking session...</p>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <button type="submit" :disabled="submitLoading || authLoading">
          {{ submitLabel }}
        </button>
      </form>

      <button
        type="button"
        class="toggle-btn"
        :disabled="submitLoading || authLoading"
        @click="toggleMode"
      >
        {{ isLoginMode ? 'Need an account? Register' : 'Already have an account? Login' }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: #f4f6f8;
}

.auth-card {
  width: min(100%, 400px);
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
  padding: 1.5rem;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0.5rem 0 1.25rem;
  color: #64748b;
  font-size: 0.95rem;
}

.auth-form {
  display: grid;
  gap: 0.65rem;
}

label {
  font-weight: 600;
  color: #0f172a;
}

input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  font: inherit;
}

input:focus {
  outline: 2px solid #bfdbfe;
  border-color: #3b82f6;
}

button {
  border: none;
  border-radius: 8px;
  padding: 0.7rem 0.85rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

button[type='submit'] {
  margin-top: 0.25rem;
  background: #2563eb;
  color: #ffffff;
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.toggle-btn {
  margin-top: 0.75rem;
  background: transparent;
  color: #334155;
  width: 100%;
}

.status,
.error {
  margin: 0.2rem 0;
  font-size: 0.9rem;
}

.status {
  color: #0f766e;
}

.error {
  color: #b91c1c;
}
</style>
