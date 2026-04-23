<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/authStore'
import familyService from '../services/familyService'
import geocodingService from '../services/geocodingService'
import tripService from '../services/tripService'
import TripMapSection from '../components/TripMapSection.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { user, profile } = storeToRefs(authStore)

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const permissionError = ref('')
const trip = ref(null)
const isAdmin = ref(false)

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

const canEdit = computed(() => {
  if (!trip.value || !user.value?.uid) {
    return false
  }

  return trip.value.createdBy === user.value.uid || isAdmin.value
})

const checkAdminRole = async (familyId, uid) => {
  const { members, error: membersError } = await familyService.getFamilyMembers(familyId)

  if (membersError) {
    return false
  }

  const currentMember = members.find((member) => member.id === uid)
  return currentMember?.role === 'admin'
}

const prefillForm = (tripData) => {
  form.title = tripData?.title || ''
  form.description = tripData?.description || ''
  form.startDate = tripData?.startDate || ''
  form.endDate = tripData?.endDate || ''
  locations.value = Array.isArray(tripData?.locations) ? [...tripData.locations] : []
}

const loadTrip = async () => {
  loading.value = true
  error.value = ''
  permissionError.value = ''
  isAdmin.value = false

  const tripId = route.params.tripId
  const { trip: fetchedTrip, error: tripError } = await tripService.getTripById(tripId)

  if (tripError || !fetchedTrip) {
    error.value = tripError?.message || 'Unable to load this trip.'
    trip.value = null
    loading.value = false
    return
  }

  trip.value = fetchedTrip

  const isCreator = fetchedTrip.createdBy === user.value?.uid
  isAdmin.value = await checkAdminRole(
    fetchedTrip.familyId || profile.value?.activeFamilyId,
    user.value?.uid,
  )

  if (!isCreator && !isAdmin.value) {
    permissionError.value = 'You do not have permission to edit this trip.'
    loading.value = false
    return
  }

  prefillForm(fetchedTrip)
  loading.value = false
}

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

const removeLocation = (index) => {
  locations.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (!trip.value?.id || !canEdit.value) {
    error.value = 'You do not have permission to edit this trip.'
    return
  }

  saving.value = true
  error.value = ''

  const { success, error: updateError } = await tripService.updateTrip(trip.value.id, {
    title: form.title,
    description: form.description,
    startDate: form.startDate,
    endDate: form.endDate,
    locations: locations.value,
  })

  if (!success || updateError) {
    error.value = updateError?.message || 'Unable to update trip right now.'
    saving.value = false
    return
  }

  await router.push(`/trip/${trip.value.id}`)
}

onMounted(() => {
  loadTrip()
})
</script>

<template>
  <main>
    <h1>Edit Trip</h1>

    <p v-if="loading">Loading trip...</p>
    <p v-else-if="error">{{ error }}</p>
    <p v-else-if="permissionError">{{ permissionError }}</p>

    <form v-else @submit.prevent="handleSubmit">
      <label for="trip-title">Title</label>
      <input id="trip-title" v-model="form.title" type="text" required :disabled="saving" />

      <label for="trip-description">Description</label>
      <textarea id="trip-description" v-model="form.description" :disabled="saving" />

      <label for="trip-start-date">Start date</label>
      <input id="trip-start-date" v-model="form.startDate" type="date" :disabled="saving" />

      <label for="trip-end-date">End date</label>
      <input id="trip-end-date" v-model="form.endDate" type="date" :disabled="saving" />

      <label for="trip-location-search">Search location</label>
      <div class="location-search-row">
        <input
          id="trip-location-search"
          v-model="locationQuery"
          type="text"
          placeholder="Search city or place"
          :disabled="saving"
        />
        <button type="button" :disabled="saving || locationLoading" @click="handleLocationSearch">
          Search
        </button>
      </div>

      <p v-if="locationLoading">Searching locations...</p>
      <p v-if="locationError">{{ locationError }}</p>

      <ul v-if="locationResults.length" class="location-results">
        <li
          v-for="(location, index) in locationResults"
          :key="`${location.name}-${location.lat}-${location.lng}-${index}`"
        >
          <span>{{ location.name }}<span v-if="location.country">, {{ location.country }}</span></span>
          <button type="button" :disabled="saving" @click="addLocation(location)">Add</button>
        </li>
      </ul>

      <section>
        <h2>Selected locations</h2>
        <ul v-if="locations.length" class="selected-locations">
          <li
            v-for="(location, index) in locations"
            :key="`${location.name}-${location.lat}-${location.lng}-${index}`"
          >
            <span>{{ location.name }}<span v-if="location.country">, {{ location.country }}</span></span>
            <button type="button" :disabled="saving" @click="removeLocation(index)">Remove</button>
          </li>
        </ul>
        <p v-else>No locations selected.</p>
      </section>

      <TripMapSection :locations="locations" />

      <button type="submit" :disabled="saving">{{ saving ? 'Saving...' : 'Save changes' }}</button>
    </form>
  </main>
</template>

<style scoped>
.location-search-row {
  display: flex;
  gap: 8px;
}

.location-results,
.selected-locations {
  list-style: none;
  padding: 0;
  margin: 12px 0;
}

.location-results li,
.selected-locations li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
</style>
