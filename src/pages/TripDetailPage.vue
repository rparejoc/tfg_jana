<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import tripService from '../services/tripService'
import TripMapSection from '../components/TripMapSection.vue'

const route = useRoute()

const loading = ref(true)
const error = ref('')
const trip = ref(null)
const photos = ref([])

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
  loading.value = false
}

onMounted(() => {
  loadTrip()
})
</script>

<template>
  <main>
    <h1>Trip Detail</h1>

    <p v-if="loading">Loading trip details...</p>
    <p v-else-if="error">{{ error }}</p>

    <section v-else>
      <h2>{{ trip.title || 'Untitled trip' }}</h2>
      <p>{{ trip.description || 'No description provided.' }}</p>
      <p><strong>Dates:</strong> {{ tripDates }}</p>

      <section>
        <h3>Participants</h3>
        <ul v-if="participantNames.length">
          <li v-for="participantName in participantNames" :key="participantName">
            {{ participantName }}
          </li>
        </ul>
        <p v-else>No participants available.</p>
      </section>

      <section>
        <h3>Map</h3>
        <TripMapSection :locations="tripLocations" />
      </section>

      <section>
        <h3>Weather</h3>
        <ul v-if="weatherItems.length">
          <li
            v-for="(weatherItem, index) in weatherItems"
            :key="`${weatherItem.locationName || 'location'}-${index}`"
          >
            <strong>{{ weatherItem.locationName || 'Unknown location' }}</strong>
            <span>
              -
              {{ weatherItem.temperatureAvg ?? 'N/A' }}°C
              · {{ weatherItem.condition || 'Unknown' }}
            </span>
          </li>
        </ul>
        <p v-else>No weather data available.</p>
      </section>

      <section>
        <h3>Photo Gallery</h3>
        <div v-if="photos.length" class="photo-grid">
          <img
            v-for="photo in photos"
            :key="photo.id"
            :src="photo.url"
            alt="Trip photo"
            class="photo-grid__image"
            loading="lazy"
          />
        </div>
        <p v-else>No photos uploaded for this trip.</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.photo-grid__image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 8px;
}
</style>
