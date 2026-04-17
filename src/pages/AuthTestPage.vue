<script setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/authStore'
import { login, logout, register } from '../services/authService'

const authStore = useAuthStore()
const { user, loading } = storeToRefs(authStore)

const email = ref('')
const password = ref('')
const actionLoading = ref(false)
const message = ref('')

const handleRegister = async () => {
  actionLoading.value = true
  message.value = ''

  const { error } = await register(email.value, password.value)
  message.value = error ? error.message : 'Registered successfully.'

  actionLoading.value = false
}

const handleLogin = async () => {
  actionLoading.value = true
  message.value = ''

  const { error } = await login(email.value, password.value)
  message.value = error ? error.message : 'Logged in successfully.'

  actionLoading.value = false
}

const handleLogout = async () => {
  actionLoading.value = true
  message.value = ''

  const { error } = await logout()
  message.value = error ? error.message : 'Logged out successfully.'

  actionLoading.value = false
}
</script>

<template>
  <main>
    <h1>Firebase Auth Test</h1>

    <p>
      <strong>Current user:</strong>
      {{ user?.email || 'No authenticated user' }}
    </p>

    <p>
      <strong>Auth store loading:</strong>
      {{ loading ? 'true' : 'false' }}
    </p>

    <p>
      <strong>Action loading:</strong>
      {{ actionLoading ? 'true' : 'false' }}
    </p>

    <label for="email">Email</label>
    <input id="email" v-model="email" type="email" placeholder="Email" />

    <label for="password">Password</label>
    <input id="password" v-model="password" type="password" placeholder="Password" />

    <div>
      <button type="button" :disabled="actionLoading" @click="handleRegister">Register</button>
      <button type="button" :disabled="actionLoading" @click="handleLogin">Login</button>
      <button type="button" :disabled="actionLoading" @click="handleLogout">Logout</button>
    </div>

    <p>{{ message }}</p>
  </main>
</template>
