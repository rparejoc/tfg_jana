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
  <main class="trip-feed-page">
    <header class="trip-feed-header">
      <h1>Trip Dashboard</h1>
      <router-link to="/trips/create">Create Trip</router-link>
    </header>

    <p v-if="loading">Loading trips...</p>
    <p v-else-if="error">{{ error }}</p>
    <p v-else-if="!activeFamilyId">Choose an active family first to see trips.</p>
    <p v-else-if="!trips.length">No trips yet</p>

    <section v-else class="trip-grid">
      <article
        v-for="trip in trips"
        :key="trip.id"
        class="trip-card"
        role="button"
        tabindex="0"
        @click="goToTrip(trip.id)"
        @keyup.enter="goToTrip(trip.id)"
      >
        <h2>{{ trip.title || 'Untitled trip' }}</h2>
        <p class="trip-dates">{{ formatDateRange(trip) }}</p>
        <p>{{ getPhotoCount(trip) }} photos</p>
        <p>{{ getLocationCount(trip) }} locations</p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.trip-feed-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
}

.trip-feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.trip-card {
  border: 1px solid #ddd;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.trip-card:hover,
.trip-card:focus-visible {
  border-color: #bbb;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
}

.trip-dates {
  color: #555;
}
</style>
