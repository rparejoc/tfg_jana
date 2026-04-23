<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import tripService from '../services/tripService'
import userService from '../services/userService'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()
const { user, currentUserContext } = storeToRefs(authStore)

const form = reactive({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
})

const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (!user.value?.uid) {
    error.value = 'You must be signed in to create a trip.'
    return
  }

  loading.value = true
  error.value = ''

  const { profile, error: profileError } = await userService.getUserProfile(user.value.uid)

  if (profileError) {
    error.value = profileError.message
    loading.value = false
    return
  }

  if (!profile?.activeFamilyId) {
    error.value = 'Selecciona o crea una familia activa antes de crear un viaje.'
    loading.value = false
    return
  }

  authStore.setProfile(profile)

  const fallbackContext = {
    uid: user.value.uid,
    displayName: user.value.displayName || null,
    email: user.value.email || null,
    activeFamilyId: profile.activeFamilyId,
  }

  const { error: createError } = await tripService.createTrip(
    form,
    currentUserContext.value || fallbackContext,
  )

  if (createError) {
    error.value = createError.message
    loading.value = false
    return
  }

  await router.push('/dashboard')
}
</script>

<template>
  <main>
    <h1>Create Trip</h1>

    <p v-if="error">{{ error }}</p>

    <form @submit.prevent="handleSubmit">
      <label for="trip-title">Title</label>
      <input
        id="trip-title"
        v-model="form.title"
        type="text"
        placeholder="Summer Vacation"
        required
        :disabled="loading"
      />

      <label for="trip-description">Description</label>
      <textarea
        id="trip-description"
        v-model="form.description"
        placeholder="A simple family trip."
        :disabled="loading"
      />

      <label for="trip-start-date">Start date</label>
      <input
        id="trip-start-date"
        v-model="form.startDate"
        type="date"
        required
        :disabled="loading"
      />

      <label for="trip-end-date">End date</label>
      <input
        id="trip-end-date"
        v-model="form.endDate"
        type="date"
        required
        :disabled="loading"
      />

      <button type="submit" :disabled="loading">
        {{ loading ? 'Creating...' : 'Create trip' }}
      </button>
    </form>
  </main>
</template>
