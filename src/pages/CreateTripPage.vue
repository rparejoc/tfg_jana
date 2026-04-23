<script setup>
import { reactive, ref } from 'vue'
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import tripService from '../services/tripService'
import userService from '../services/userService'
import geocodingService from '../services/geocodingService'
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

  const { tripId, error: createError } = await tripService.createTrip(
    {
      ...form,
      locations: locations.value,
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
  <main>
    <h1>Create Trip</h1>

    <p v-if="error">{{ error }}</p>
    <p v-if="uploadLoading">Uploading photos...</p>

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

      <label for="trip-location-search">Search location</label>
      <input
        id="trip-location-search"
        v-model="locationQuery"
        type="text"
        placeholder="Search city or place"
        :disabled="loading || locationLoading"
      />
      <button
        type="button"
        @click="handleLocationSearch"
        :disabled="loading || locationLoading"
      >
        {{ locationLoading ? 'Searching...' : 'Add location' }}
      </button>

      <p v-if="locationError">{{ locationError }}</p>

      <ul v-if="locationResults.length">
        <li
          v-for="(result, index) in locationResults"
          :key="`${result.name}-${result.lat}-${result.lng}-${index}`"
        >
          {{ result.name }} ({{ result.country }})
          <button type="button" @click="addLocation(result)" :disabled="loading">
            Select
          </button>
        </li>
      </ul>

      <h2>Added locations</h2>
      <ul v-if="locations.length">
        <li
          v-for="(location, index) in locations"
          :key="`${location.name}-${location.lat}-${location.lng}-${index}`"
        >
          {{ location.name }} ({{ location.country }}) - {{ location.lat }}, {{ location.lng }}
        </li>
      </ul>
      <p v-else>No locations added yet.</p>


      <TripMapSection v-if="locations.length" :locations="locations" />

      <PhotoUploader :disabled="loading || uploadLoading" @update:selected-files="handlePhotosSelected" />

      <button type="submit" :disabled="loading || uploadLoading">
        {{ loading || uploadLoading ? 'Creating...' : 'Create trip' }}
      </button>
    </form>
  </main>
</template>
