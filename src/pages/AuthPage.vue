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

const modeTitle = computed(() => (isLoginMode.value ? 'Welcome back' : 'Create your account'))
const modeSubtitle = computed(() => (isLoginMode.value
  ? 'Sign in to keep planning and sharing your family trips.'
  : 'Join FamTrip and start building family travel memories.'))
const submitLabel = computed(() => (submitLoading.value
  ? (isLoginMode.value ? 'Signing in...' : 'Creating account...')
  : (isLoginMode.value ? 'Sign in' : 'Create account')))
const toggleLabel = computed(() => (isLoginMode.value
  ? 'New to FamTrip? Create an account'
  : 'Already have an account? Sign in'))
const passwordAutocomplete = computed(() => (isLoginMode.value ? 'current-password' : 'new-password'))

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
  <main class="relative grid min-h-[calc(100vh-64px)] overflow-hidden bg-gradient-to-br from-brand-50 via-white to-emerald-50 px-4 py-10 sm:px-6 lg:px-8">
    <div class="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-100/70 blur-3xl" aria-hidden="true"></div>
    <div class="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-100/80 blur-3xl" aria-hidden="true"></div>

    <section class="relative mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div class="hidden rounded-[2rem] bg-brand-700 p-8 text-white shadow-2xl shadow-brand-700/20 lg:block">
        <p class="text-sm font-semibold uppercase tracking-[0.28em] text-brand-100">FamTrip</p>
        <h1 class="mt-5 text-4xl font-black leading-tight tracking-tight">
          Plan trips, collect memories, and keep the whole family in sync.
        </h1>
        <p class="mt-5 max-w-md text-base leading-7 text-brand-50/90">
          Access your shared dashboard to organize destinations, dates, photos, and family plans from one simple place.
        </p>
        <div class="mt-8 grid grid-cols-3 gap-3 text-sm">
          <div class="rounded-2xl bg-white/12 p-4 backdrop-blur">
            <p class="text-2xl font-bold">01</p>
            <p class="mt-1 text-brand-50/80">Create a trip</p>
          </div>
          <div class="rounded-2xl bg-white/12 p-4 backdrop-blur">
            <p class="text-2xl font-bold">02</p>
            <p class="mt-1 text-brand-50/80">Invite family</p>
          </div>
          <div class="rounded-2xl bg-white/12 p-4 backdrop-blur">
            <p class="text-2xl font-bold">03</p>
            <p class="mt-1 text-brand-50/80">Share photos</p>
          </div>
        </div>
      </div>

      <div class="w-full rounded-[1.75rem] border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-200/80 backdrop-blur sm:p-8">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white shadow-lg shadow-brand-600/30">
          FT
        </div>
        <div class="mt-6 text-center">
          <p class="text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">FamTrip access</p>
          <h1 class="mt-3 text-3xl font-black tracking-tight text-slate-950">{{ modeTitle }}</h1>
          <p class="mt-3 text-sm leading-6 text-slate-600">{{ modeSubtitle }}</p>
        </div>

        <form class="mt-8 space-y-5" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label for="email" class="text-sm font-semibold text-slate-800">Email</label>
            <input
              id="email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              required
              :disabled="submitLoading || authLoading"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-100 transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <div class="space-y-2">
            <label for="password" class="text-sm font-semibold text-slate-800">Password</label>
            <input
              id="password"
              v-model="password"
              type="password"
              :autocomplete="passwordAutocomplete"
              placeholder="••••••••"
              required
              minlength="6"
              :disabled="submitLoading || authLoading"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-brand-100 transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>

          <p v-if="authLoading && !submitLoading" class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            Checking session...
          </p>
          <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="submitLoading || authLoading"
            class="flex w-full items-center justify-center rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30 transition hover:-translate-y-0.5 hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-slate-400 disabled:shadow-none"
          >
            {{ submitLabel }}
          </button>
        </form>

        <button
          type="button"
          class="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitLoading || authLoading"
          @click="toggleMode"
        >
          {{ toggleLabel }}
        </button>
      </div>
    </section>
  </main>
</template>
