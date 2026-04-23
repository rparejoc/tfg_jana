<script setup>
import { reactive, ref } from 'vue'
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import tripService from '../services/tripService'
import userService from '../services/userService'
import geocodingService from '../services/geocodingService'
import weatherService from '../services/weatherService'
import { useAuthStore } from '../stores/authStore'
import { db } from '../firebase'
import TripMapSection from '../components/TripMapSection.vue'
import PhotoUploader from '../components/PhotoUploader.vue'
import photoService from '../services/photoService'

const router = useRouter()
const authStore = useAuthStore()
const { user, currentUserContext } = storeToRefs(authStore)

const form = reactive({
  title: '',
  description: '',
  startDate: '',
  endDate: '',
})

const locationQuery = ref('')
const locationResults = ref([])
const locations = ref([])
const locationLoading = ref(false)
const locationError = ref('')

const loading = ref(false)
const uploadLoading = ref(false)
const error = ref('')
const photoFiles = ref([])

const handleLocationSearch = async () => {
  if (!locationQuery.value.trim()) {
    locationResults.value = []
    locationError.value = 'Type a location to search.'
    return
  }

  locationLoading.value = true
  locationError.value = ''

  const { locations: searchedLocations, error: searchError } =
    await geocodingService.searchLocation(locationQuery.value)

  if (searchError) {
    locationError.value = searchError.message
    locationResults.value = []
    locationLoading.value = false
    return
  }

  locationResults.value = searchedLocations

  if (!searchedLocations.length) {
    locationError.value = 'No results found for this search.'
  }

  locationLoading.value = false
}

const addLocation = (location) => {
  const alreadyAdded = locations.value.some(
    (savedLocation) =>
      savedLocation.lat === location.lat &&
      savedLocation.lng === location.lng &&
      savedLocation.name === location.name,
  )

  if (alreadyAdded) {
    locationError.value = 'This location is already added.'
    return
  }

  locations.value.push({
    name: location.name,
    country: location.country,
    lat: location.lat,
    lng: location.lng,
  })

  locationError.value = ''
}


const handlePhotosSelected = (selectedFiles) => {
  photoFiles.value = selectedFiles
}

const getPhotoIdFromStoragePath = (storagePath) =>
  storagePath?.split('/').pop()?.replace('.jpg', '') || null


const buildWeatherSnapshots = async () => {
  const weatherDate = form.startDate || new Date().toISOString().slice(0, 10)
  const weatherSnapshots = []
  let hasFailures = false

  for (const location of locations.value) {
    const { weather, error: weatherError } = await weatherService.getWeather(
      location.lat,
      location.lng,
      weatherDate,
      location.name,
    )

    weatherSnapshots.push(weather)

    if (weatherError) {
      hasFailures = true
    }
  }

  if (hasFailures) {
    error.value =
      'Trip will be created, but some weather data could not be loaded.'
  }

  return weatherSnapshots
}

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

  const weather = await buildWeatherSnapshots()

  const { tripId, error: createError } = await tripService.createTrip(
    {
      ...form,
      locations: locations.value,
      weather,
    },
    currentUserContext.value || fallbackContext,
  )

  if (createError || !tripId) {
    error.value = createError?.message || 'Unable to create trip right now.'
    loading.value = false
    return
  }

  if (photoFiles.value.length) {
    uploadLoading.value = true

    try {
      let uploadedCount = 0
      const uploadErrors = []

      for (const file of photoFiles.value) {
        const { url, storagePath, error: uploadError } = await photoService.uploadPhoto(
          file,
          user.value,
          tripId,
          profile.activeFamilyId,
        )

        if (uploadError || !url || !storagePath) {
          uploadErrors.push(file.name)
          continue
        }

        const photoId = getPhotoIdFromStoragePath(storagePath)

        if (!photoId) {
          uploadErrors.push(file.name)
          continue
        }

        await setDoc(doc(collection(db, 'trips', tripId, 'photos'), photoId), {
          url,
          storagePath,
          uploadedBy: user.value.uid,
          uploadedAt: serverTimestamp(),
        })

        uploadedCount += 1
      }

      await updateDoc(doc(db, 'trips', tripId), {
        photoCount: uploadedCount,
        updatedAt: serverTimestamp(),
      })

      if (uploadErrors.length) {
        error.value = `Trip created, but ${uploadErrors.length} photo(s) failed to upload.`
        loading.value = false
        return
      }
    } catch (uploadProcessError) {
      error.value = uploadProcessError?.message || 'Trip created, but photo processing failed.'
      loading.value = false
      uploadLoading.value = false
      return
    }

    uploadLoading.value = false
  }

  await router.push('/dashboard')
}
</script>

<template>
  <main class="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900">Create Trip</h1>

    <p v-if="error" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{{ error }}</p>
    <p v-if="uploadLoading" class="mt-3 text-sm text-slate-600">Uploading photos...</p>

    <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
      <div class="grid gap-5 sm:grid-cols-2">
        <div class="space-y-1.5 sm:col-span-2">
          <label for="trip-title" class="text-sm font-medium text-slate-700">Title</label>
          <input id="trip-title" v-model="form.title" type="text" placeholder="Summer Vacation" required :disabled="loading" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-100 focus:border-brand-600 focus:ring-4"/>
        </div>

        <div class="space-y-1.5 sm:col-span-2">
          <label for="trip-description" class="text-sm font-medium text-slate-700">Description</label>
          <textarea id="trip-description" v-model="form.description" placeholder="A simple family trip." :disabled="loading" class="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-100 focus:border-brand-600 focus:ring-4"></textarea>
        </div>

        <div class="space-y-1.5">
          <label for="trip-start-date" class="text-sm font-medium text-slate-700">Start date</label>
          <input id="trip-start-date" v-model="form.startDate" type="date" required :disabled="loading" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-100 focus:border-brand-600 focus:ring-4"/>
        </div>

        <div class="space-y-1.5">
          <label for="trip-end-date" class="text-sm font-medium text-slate-700">End date</label>
          <input id="trip-end-date" v-model="form.endDate" type="date" required :disabled="loading" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-100 focus:border-brand-600 focus:ring-4"/>
        </div>
      </div>

      <div class="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label for="trip-location-search" class="text-sm font-medium text-slate-700">Search location</label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <input id="trip-location-search" v-model="locationQuery" type="text" placeholder="Search city or place" :disabled="loading || locationLoading" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand-100 focus:border-brand-600 focus:ring-4"/>
          <button type="button" @click="handleLocationSearch" :disabled="loading || locationLoading" class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60">{{ locationLoading ? 'Searching...' : 'Add location' }}</button>
        </div>

        <p v-if="locationError" class="text-sm text-rose-600">{{ locationError }}</p>

        <ul v-if="locationResults.length" class="space-y-2">
          <li v-for="(result, index) in locationResults" :key="`${result.name}-${result.lat}-${result.lng}-${index}`" class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <span>{{ result.name }} ({{ result.country }})</span>
            <button type="button" @click="addLocation(result)" :disabled="loading" class="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium transition hover:bg-slate-100">Select</button>
          </li>
        </ul>
      </div>

      <div>
        <h2 class="text-base font-semibold text-slate-900">Added locations</h2>
        <ul v-if="locations.length" class="mt-2 space-y-1.5 text-sm text-slate-600">
          <li v-for="(location, index) in locations" :key="`${location.name}-${location.lat}-${location.lng}-${index}`">{{ location.name }} ({{ location.country }}) - {{ location.lat }}, {{ location.lng }}</li>
        </ul>
        <p v-else class="mt-2 text-sm text-slate-500">No locations added yet.</p>
      </div>

      <TripMapSection v-if="locations.length" :locations="locations" />

      <PhotoUploader :disabled="loading || uploadLoading" @update:selected-files="handlePhotosSelected" />

      <button type="submit" :disabled="loading || uploadLoading" class="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60">
        {{ loading || uploadLoading ? 'Creating...' : 'Create trip' }}
      </button>
    </form>
  </main>
</template>
