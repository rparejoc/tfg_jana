<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import tripService from '../services/tripService'

const router = useRouter()
const authStore = useAuthStore()
const { profile } = storeToRefs(authStore)

const loading = ref(false)
const error = ref('')
const trips = ref([])

const activeFamilyId = computed(() => profile.value?.activeFamilyId || null)

const formatDateRange = (trip) => {
  const startDate = trip?.startDate || null
  const endDate = trip?.endDate || null

  if (!startDate && !endDate) {
    return 'Dates not set'
  }

  if (!startDate) {
    return `Until ${endDate}`
  }

  if (!endDate) {
    return `From ${startDate}`
  }

  return `${startDate} - ${endDate}`
}

const getLocationCount = (trip) => (Array.isArray(trip?.locations) ? trip.locations.length : 0)

const getPhotoCount = (trip) => {
  if (typeof trip?.photoCount === 'number') {
    return trip.photoCount
  }

  return Array.isArray(trip?.photos) ? trip.photos.length : 0
}

const goToTrip = (tripId) => {
  if (!tripId) {
    return
  }

  router.push(`/trip/${tripId}`)
}

const loadTrips = async () => {
  if (!activeFamilyId.value) {
    trips.value = []
    error.value = ''
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''

  const { trips: familyTrips, error: tripsError } = await tripService.getTripsByFamily(activeFamilyId.value)

  if (tripsError) {
    error.value = tripsError.message
    trips.value = []
    loading.value = false
    return
  }

  trips.value = familyTrips
  loading.value = false
}

onMounted(() => {
  loadTrips()
})

watch(activeFamilyId, () => {
  loadTrips()
})
</script>

<template>
  <main class="space-y-6">
    <header class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Trip Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">All your family adventures in one place.</p>
      </div>
      <router-link
        to="/trips/create"
        class="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Create Trip
      </router-link>
    </header>

    <p v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading trips...</p>
    <p v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
    <p v-else-if="!activeFamilyId" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Choose an active family first to see trips.</p>
    <p v-else-if="!trips.length" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No trips yet.</p>

    <section v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="trip in trips"
        :key="trip.id"
        class="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md focus-within:border-brand-300"
        role="button"
        tabindex="0"
        @click="goToTrip(trip.id)"
        @keyup.enter="goToTrip(trip.id)"
      >
        <h2 class="text-lg font-semibold text-slate-900 group-hover:text-brand-700">{{ trip.title || 'Untitled trip' }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ formatDateRange(trip) }}</p>
        <div class="mt-4 flex items-center gap-3 text-sm text-slate-600">
          <span class="rounded-full bg-slate-100 px-2.5 py-1">📷 {{ getPhotoCount(trip) }} photos</span>
          <span class="rounded-full bg-slate-100 px-2.5 py-1">📍 {{ getLocationCount(trip) }} locations</span>
        </div>
      </article>
    </section>
  </main>
</template>
