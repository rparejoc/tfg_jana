<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import familyService from '../services/familyService'
import tripService from '../services/tripService'
import { useAuthStore } from '../stores/authStore'
import TripMapSection from '../components/TripMapSection.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { user, profile } = storeToRefs(authStore)

const loading = ref(true)
const error = ref('')
const trip = ref(null)
const photos = ref([])
const isAdmin = ref(false)

const tripDates = computed(() => {
  if (!trip.value) {
    return 'Dates unavailable'
  }

  const startDate = trip.value.startDate || 'Unknown start date'
  const endDate = trip.value.endDate || 'Unknown end date'

  return `${startDate} - ${endDate}`
})

const participantNames = computed(() => {
  if (!Array.isArray(trip.value?.participantNames) || !trip.value.participantNames.length) {
    return []
  }

  return trip.value.participantNames
})

const tripLocations = computed(() => {
  if (!Array.isArray(trip.value?.locations)) {
    return []
  }

  return trip.value.locations
})

const weatherItems = computed(() => {
  if (!Array.isArray(trip.value?.weather)) {
    return []
  }

  return trip.value.weather
})

const canManageTrip = computed(() => {
  if (!trip.value || !user.value?.uid) {
    return false
  }

  return trip.value.createdBy === user.value.uid || isAdmin.value
})

const checkAdminRole = async (familyId, uid) => {
  if (!familyId || !uid) {
    return false
  }

  const { members, error: membersError } = await familyService.getFamilyMembers(familyId)

  if (membersError) {
    return false
  }

  const currentMember = members.find((member) => member.id === uid)
  return currentMember?.role === 'admin'
}

const loadTrip = async () => {
  loading.value = true
  error.value = ''

  const tripId = route.params.tripId

  const {
    trip: fetchedTrip,
    photos: fetchedPhotos,
    error: tripError,
  } = await tripService.getTripById(tripId)

  if (tripError || !fetchedTrip) {
    error.value = tripError?.message || 'Unable to load this trip.'
    trip.value = null
    photos.value = []
    loading.value = false
    return
  }

  trip.value = fetchedTrip
  photos.value = fetchedPhotos
  isAdmin.value = await checkAdminRole(
    fetchedTrip.familyId || profile.value?.activeFamilyId,
    user.value?.uid,
  )
  loading.value = false
}

const handleDeleteTrip = async () => {
  if (!trip.value?.id || !canManageTrip.value) {
    return
  }

  const confirmed = window.confirm('Are you sure you want to delete this trip?')

  if (!confirmed) {
    return
  }

  const { success, error: deleteError } = await tripService.deleteTrip(
    trip.value.id,
    trip.value.familyId || profile.value?.activeFamilyId,
  )

  if (!success || deleteError) {
    error.value = deleteError?.message || 'Unable to delete this trip right now.'
    return
  }

  await router.push('/dashboard')
}

onMounted(() => {
  loadTrip()
})
</script>

<template>
  <main class="space-y-6">
    <p v-if="loading" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading trip details...</p>
    <p v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>

    <section v-else class="space-y-6">
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-slate-900">{{ trip.title || 'Untitled trip' }}</h1>
            <p class="mt-2 text-sm text-slate-600">{{ trip.description || 'No description provided.' }}</p>
            <p class="mt-2 text-sm font-medium text-slate-700">Dates: {{ tripDates }}</p>
          </div>

          <div v-if="canManageTrip" class="flex gap-2">
            <router-link :to="`/trip/${trip.id}/edit`" class="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Edit trip</router-link>
            <button type="button" @click="handleDeleteTrip" class="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Delete trip</button>
          </div>
        </div>

        <div class="mt-5">
          <h2 class="text-base font-semibold text-slate-900">Participants</h2>
          <ul v-if="participantNames.length" class="mt-2 flex flex-wrap gap-2">
            <li v-for="participantName in participantNames" :key="participantName" class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{{ participantName }}</li>
          </ul>
          <p v-else class="mt-2 text-sm text-slate-500">No participants available.</p>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-slate-900">Map</h3>
        <div class="mt-4">
          <TripMapSection :locations="tripLocations" />
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-slate-900">Weather</h3>
        <ul v-if="weatherItems.length" class="mt-4 grid gap-2 sm:grid-cols-2">
          <li v-for="(weatherItem, index) in weatherItems" :key="`${weatherItem.locationName || 'location'}-${index}`" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <strong class="text-slate-900">{{ weatherItem.locationName || 'Unknown location' }}</strong>
            <span class="ml-1">{{ weatherItem.temperatureAvg ?? 'N/A' }}°C · {{ weatherItem.condition || 'Unknown' }}</span>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-500">No weather data available.</p>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="text-lg font-semibold text-slate-900">Photo Gallery</h3>
        <div v-if="photos.length" class="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          <img
            v-for="photo in photos"
            :key="photo.id"
            :src="photo.url"
            alt="Trip photo"
            class="h-40 w-full rounded-xl object-cover"
            loading="lazy"
          />
        </div>
        <p v-else class="mt-2 text-sm text-slate-500">No photos uploaded for this trip.</p>
      </section>
    </section>
  </main>
</template>
