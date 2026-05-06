<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import authService from '../services/authService'
import { useAuthStore } from '../stores/authStore'
import { usePreferences } from '../composables/usePreferences'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const { isDarkTheme, locale, nextThemeLabel, setLocale, t, themeLabel, toggleTheme } = usePreferences()

const isAuthLayout = computed(() => route.meta.layout === 'auth')
const userEmail = computed(() => user.value?.email || t('nav.noEmail'))

const navItems = computed(() => [
  { label: t('nav.dashboard'), to: '/dashboard' },
  { label: t('nav.family'), to: '/families' },
])

const handleLocaleChange = (event) => {
  setLocale(event.target.value)
}

const handleLogout = async () => {
  const { error } = await authService.logout()

  if (!error) {
    await router.push('/')
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300">
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur transition-colors duration-300">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <router-link to="/dashboard" class="text-xl font-bold text-brand-700">FamTrip</router-link>

        <div class="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-brand-100"
            :aria-label="nextThemeLabel"
            :aria-pressed="isDarkTheme"
            @click="toggleTheme"
          >
            <span aria-hidden="true">{{ isDarkTheme ? '🌙' : '☀️' }}</span>
            <span class="hidden sm:inline">{{ themeLabel }}</span>
          </button>

          <label class="sr-only" for="app-language">{{ t('language.label') }}</label>
          <select
            id="app-language"
            :value="locale"
            class="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
            :aria-label="t('language.label')"
            @change="handleLocaleChange"
          >
            <option value="en">{{ t('language.en') }}</option>
            <option value="es">{{ t('language.es') }}</option>
          </select>

          <div v-if="!isAuthLayout && user" class="flex items-center gap-3">
            <p class="hidden rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 sm:block">
              {{ userEmail }}
            </p>
            <button
              type="button"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
              @click="handleLogout"
            >
              {{ t('nav.logout') }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <div v-if="!isAuthLayout && user" class="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
      <aside class="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors duration-300">
        <nav class="space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
            active-class="bg-brand-100 text-brand-700"
          >
            {{ item.label }}
          </router-link>
        </nav>
      </aside>

      <main class="min-w-0">
        <slot />
      </main>
    </div>

    <main v-else class="min-h-[calc(100vh-64px)]">
      <slot />
    </main>
  </div>
</template>
