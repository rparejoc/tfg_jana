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

const fallbackHeroGradient = 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #38bdf8 100%)'

const formatDisplayDate = (dateValue, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!dateValue) {
    return null
  }

  const parsedDate = new Date(`${dateValue}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return dateValue
  }

  return new Intl.DateTimeFormat('en', options).format(parsedDate)
}

const tripDates = computed(() => {
  if (!trip.value) {
    return 'Dates unavailable'
  }

  const startDate = formatDisplayDate(trip.value.startDate)
  const endDate = formatDisplayDate(trip.value.endDate)

  if (!startDate && !endDate) {
    return 'Dates unavailable'
  }

  if (!startDate) {
    return `Until ${endDate}`
  }

  if (!endDate) {
    return `From ${startDate}`
  }

  return `${startDate} - ${endDate}`
})

const participantNames = computed(() => {
  if (!Array.isArray(trip.value?.participantNames) || !trip.value.participantNames.length) {
    return []
  }

  return trip.value.participantNames
})

const participantInitials = computed(() =>
  participantNames.value.map((participantName) =>
    participantName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((namePart) => namePart[0]?.toUpperCase())
      .join('') || '?',
  ),
)

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

const heroStyle = computed(() => ({
  backgroundImage: photos.value[0]?.url
    ? `linear-gradient(rgba(15, 23, 42, 0.32), rgba(15, 23, 42, 0.44)), url(${photos.value[0].url})`
    : fallbackHeroGradient,
}))

const visitedLocations = computed(() =>
  tripLocations.value.map((location, index) => {
    const matchingWeather =
      location.weather ||
      weatherItems.value.find((weatherItem) => weatherItem?.locationName === location.name) ||
      weatherItems.value[index] ||
      null

    return {
      ...location,
      weather: matchingWeather,
      photo: photos.value[index]?.url || photos.value[0]?.url || null,
    }
  }),
)

const galleryPhotos = computed(() =>
  photos.value.map((photo, index) => ({
    ...photo,
    caption:
      photo.caption ||
      photo.description ||
      (visitedLocations.value[index]?.name
        ? `Memory from ${visitedLocations.value[index].name}`
        : `Trip memory ${index + 1}`),
  })),
)

const canManageTrip = computed(() => {
  if (!trip.value || !user.value?.uid) {
    return false
  }

  return trip.value.createdBy === user.value.uid || isAdmin.value
})

const getLocationLabel = (location) => {
  if (!location?.name && !location?.country) {
    return 'Unknown location'
  }

  return [location.name, location.country].filter(Boolean).join(', ')
}

const getWeatherCondition = (weather) => weather?.condition || 'No forecast'

const getWeatherDate = (weather, fallbackStart = trip.value?.startDate) =>
  formatDisplayDate(weather?.date || fallbackStart, { month: 'short', day: 'numeric' }) || 'Date pending'

const getWeatherTemp = (weather) => {
  if (typeof weather?.temperatureAvg !== 'number') {
    return 'N/A'
  }

  return `${Math.round(weather.temperatureAvg)}°C`
}

const getWeatherIconTone = (weather) => {
  const condition = getWeatherCondition(weather).toLowerCase()

  if (condition.includes('cloud')) {
    return 'cloudy'
  }

  if (condition.includes('rain') || condition.includes('storm')) {
    return 'rainy'
  }

  return 'sunny'
}

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
  <main class="space-y-8">
    <p v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">Loading trip details...</p>
    <p v-else-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">{{ error }}</p>

    <section v-else class="space-y-8">
      <section class="relative -mx-4 overflow-hidden rounded-b-[2rem] bg-cover bg-center px-4 pb-8 pt-28 shadow-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" :style="heroStyle">
        <div class="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/20 to-slate-50"></div>
        <article class="relative mx-auto max-w-5xl rounded-3xl border border-white/70 bg-white p-6 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-8">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-3xl">
              <p class="text-xs font-bold uppercase tracking-[0.28em] text-brand-600">Trip detail</p>
              <h1 class="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{{ trip.title || 'Untitled trip' }}</h1>
              <p class="mt-3 max-w-2xl text-base leading-7 text-slate-600">{{ trip.description || 'No description provided.' }}</p>
            </div>

            <div v-if="canManageTrip" class="flex shrink-0 gap-3">
              <router-link :to="`/trip/${trip.id}/edit`" class="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-200 transition hover:-translate-y-0.5 hover:bg-brand-700">
                <span aria-hidden="true">✎</span>
                Edit Trip
              </router-link>
              <button type="button" @click="handleDeleteTrip" class="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-600 transition hover:-translate-y-0.5 hover:bg-rose-50">
                <span aria-hidden="true">⌫</span>
                Delete Trip
              </button>
            </div>
          </div>

          <div class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm font-semibold text-slate-700">
            <div class="inline-flex items-center gap-2">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">📅</span>
              <span>{{ tripDates }}</span>
            </div>
            <div class="inline-flex items-center gap-3">
              <span class="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600" aria-hidden="true">👥</span>
              <div v-if="participantNames.length" class="flex items-center gap-3">
                <div class="flex -space-x-2">
                  <span v-for="(initials, index) in participantInitials.slice(0, 5)" :key="`${initials}-${index}`" class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-xs font-black text-white shadow-sm">
                    {{ initials }}
                  </span>
                </div>
                <span>{{ participantNames.join(', ') }}</span>
              </div>
              <span v-else>No participants available.</span>
            </div>
          </div>
        </article>
      </section>

      <section class="space-y-4">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.28em] text-brand-600">Route</p>
            <h2 class="mt-1 text-2xl font-black text-slate-950">Trip Route</h2>
          </div>
          <span class="rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-sm">{{ tripLocations.length }} locations</span>
        </div>
        <div class="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-3 shadow-sm">
          <TripMapSection :locations="tripLocations" />
        </div>
      </section>

      <section class="space-y-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.28em] text-brand-600">Stops</p>
          <h2 class="mt-1 text-2xl font-black text-slate-950">Locations Visited</h2>
        </div>

        <div v-if="visitedLocations.length" class="space-y-4">
          <article v-for="(location, index) in visitedLocations" :key="`${location.name}-${location.lat}-${location.lng}-${index}`" class="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md sm:flex sm:items-start sm:gap-5">
            <div class="h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-sky-100 sm:h-24 sm:w-28">
              <img v-if="location.photo" :src="location.photo" :alt="getLocationLabel(location)" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
              <div v-else class="flex h-full w-full items-center justify-center text-3xl" aria-hidden="true">📍</div>
            </div>
            <div class="mt-4 min-w-0 flex-1 sm:mt-0">
              <h3 class="flex items-center gap-2 text-xl font-black text-slate-950">
                <span class="text-brand-600" aria-hidden="true">⌖</span>
                {{ getLocationLabel(location) }}
              </h3>
              <p class="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <span aria-hidden="true">📅</span>
                {{ getWeatherDate(location.weather) }}
              </p>
              <p class="mt-3 text-sm leading-6 text-slate-600">
                Stop {{ index + 1 }} of the route with saved coordinates for the family itinerary.
              </p>
              <div class="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-700">
                <span v-if="getWeatherIconTone(location.weather) === 'cloudy'" class="text-xl" aria-hidden="true">☁️</span>
                <span v-else-if="getWeatherIconTone(location.weather) === 'rainy'" class="text-xl" aria-hidden="true">🌧️</span>
                <span v-else class="text-xl" aria-hidden="true">☀️</span>
                <span>{{ getWeatherTemp(location.weather) }}</span>
                <span class="font-medium text-slate-500">{{ getWeatherCondition(location.weather) }}</span>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">No locations saved for this trip.</p>
      </section>

      <section class="space-y-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.28em] text-brand-600">Forecast</p>
          <h2 class="mt-1 text-2xl font-black text-slate-950">Weather Overview</h2>
        </div>
        <ul v-if="weatherItems.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <li v-for="(weatherItem, index) in weatherItems" :key="`${weatherItem.locationName || 'location'}-${index}`" class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p class="text-lg font-black text-slate-950">{{ weatherItem.locationName || visitedLocations[index]?.name || 'Unknown location' }}</p>
            <p class="mt-1 text-sm font-semibold text-slate-500">{{ getWeatherDate(weatherItem) }}</p>
            <div class="mt-6 flex items-center gap-4">
              <div class="flex h-14 w-14 items-center justify-center rounded-full" :class="getWeatherIconTone(weatherItem) === 'cloudy' ? 'bg-slate-100' : getWeatherIconTone(weatherItem) === 'rainy' ? 'bg-sky-100' : 'bg-amber-100'">
                <span v-if="getWeatherIconTone(weatherItem) === 'cloudy'" class="text-3xl" aria-hidden="true">☁️</span>
                <span v-else-if="getWeatherIconTone(weatherItem) === 'rainy'" class="text-3xl" aria-hidden="true">🌧️</span>
                <span v-else class="text-3xl" aria-hidden="true">☀️</span>
              </div>
              <div>
                <p class="text-3xl font-black text-slate-950">{{ getWeatherTemp(weatherItem) }}</p>
                <p class="text-sm font-medium text-slate-500">{{ getWeatherCondition(weatherItem) }}</p>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">No weather data available.</p>
      </section>

      <section class="space-y-4 rounded-[2rem] bg-slate-100/70 p-5 sm:p-8">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.28em] text-brand-600">Memories</p>
          <h2 class="mt-1 text-2xl font-black text-slate-950">Photo Gallery</h2>
        </div>
        <div v-if="galleryPhotos.length" class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <figure v-for="photo in galleryPhotos" :key="photo.id" class="group">
            <div class="h-56 overflow-hidden rounded-3xl bg-white shadow-sm">
              <img :src="photo.url" :alt="photo.caption" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
            </div>
            <figcaption class="mt-3 text-sm font-bold text-slate-600">{{ photo.caption }}</figcaption>
          </figure>
        </div>
        <p v-else class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">No photos uploaded for this trip.</p>
      </section>
    </section>
  </main>
</template>
