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

const participantCount = computed(() => {
  if (Array.isArray(trip.value?.participantIds)) {
    return trip.value.participantIds.length
  }

  if (Array.isArray(trip.value?.participantNames)) {
    return trip.value.participantNames.length
  }

  return 0
})

const photoCount = computed(() => trip.value?.photoCount || 0)

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

  locationQuery.value = ''
  locationResults.value = []
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
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div class="relative isolate bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-6 py-10 text-white sm:px-10">
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_32rem)]"></div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">Family trip editor</p>
        <div class="mt-4 max-w-3xl">
          <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">Edit your adventure</h1>
          <p class="mt-3 text-base leading-7 text-white/85 sm:text-lg">
            Keep the same trip structure while updating dates, details, and destinations for the whole family.
          </p>
        </div>
        <div class="mt-8 grid gap-3 text-sm sm:grid-cols-3">
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ participantCount }}</p>
            <p class="text-white/75">participants</p>
          </div>
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ locations.length }}</p>
            <p class="text-white/75">locations</p>
          </div>
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ photoCount }}</p>
            <p class="text-white/75">photos</p>
          </div>
        </div>
      </div>

      <div class="bg-slate-50/80 px-6 py-8 sm:px-10">
        <p v-if="loading" class="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">Loading trip...</p>
        <p v-else-if="error" class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
        <p v-else-if="permissionError" class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{{ permissionError }}</p>

        <form v-else class="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]" @submit.prevent="handleSubmit">
          <div class="space-y-6">
            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Step 1</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">Trip details</h2>
                </div>
                <span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Required</span>
              </div>

              <div class="mt-5 grid gap-5 sm:grid-cols-2">
                <div class="space-y-1.5 sm:col-span-2">
                  <label for="trip-title" class="text-sm font-medium text-slate-700">Title</label>
                  <input id="trip-title" v-model="form.title" type="text" placeholder="Summer vacation" required :disabled="saving" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>

                <div class="space-y-1.5 sm:col-span-2">
                  <label for="trip-description" class="text-sm font-medium text-slate-700">Description</label>
                  <textarea id="trip-description" v-model="form.description" placeholder="A simple family trip with stops, photos, and shared plans." :disabled="saving" class="min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100"></textarea>
                </div>

                <div class="space-y-1.5">
                  <label for="trip-start-date" class="text-sm font-medium text-slate-700">Start date</label>
                  <input id="trip-start-date" v-model="form.startDate" type="date" required :disabled="saving" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>

                <div class="space-y-1.5">
                  <label for="trip-end-date" class="text-sm font-medium text-slate-700">End date</label>
                  <input id="trip-end-date" v-model="form.endDate" type="date" required :disabled="saving" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Step 2</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">Locations and weather</h2>
                  <p class="mt-1 text-sm text-slate-500">Search for destinations and adjust the saved stops for this trip.</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ locations.length }} added</span>
              </div>

              <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label for="trip-location-search" class="text-sm font-medium text-slate-700">Search location</label>
                <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input id="trip-location-search" v-model="locationQuery" type="text" placeholder="Search city or place" :disabled="saving || locationLoading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                  <button type="button" :disabled="saving || locationLoading" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60" @click="handleLocationSearch">{{ locationLoading ? 'Searching...' : 'Search' }}</button>
                </div>

                <p v-if="locationError" class="mt-3 text-sm text-rose-600">{{ locationError }}</p>

                <ul v-if="locationResults.length" class="mt-4 space-y-2">
                  <li v-for="(location, index) in locationResults" :key="`${location.name}-${location.lat}-${location.lng}-${index}`" class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <span class="min-w-0">
                      <span class="block truncate font-semibold text-slate-800">{{ location.name }}</span>
                      <span class="text-xs text-slate-500">{{ location.country }} · {{ location.lat }}, {{ location.lng }}</span>
                    </span>
                    <button type="button" :disabled="saving" class="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100" @click="addLocation(location)">Select</button>
                  </li>
                </ul>
              </div>

              <div class="mt-5">
                <h3 class="text-sm font-semibold text-slate-900">Added locations</h3>
                <ul v-if="locations.length" class="mt-3 grid gap-3">
                  <li v-for="(location, index) in locations" :key="`${location.name}-${location.lat}-${location.lng}-${index}`" class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <p class="font-semibold text-slate-900">{{ location.name }}<span v-if="location.country">, {{ location.country }}</span></p>
                      <p class="mt-1 text-xs text-slate-500">{{ location.lat }}, {{ location.lng }}</p>
                      <p class="mt-2 text-xs font-medium text-brand-700">Saved weather data is kept with existing destinations.</p>
                    </div>
                    <button type="button" :disabled="saving" class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="removeLocation(index)">Remove</button>
                  </li>
                </ul>
                <p v-else class="mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">You have not added any locations yet.</p>
              </div>

              <TripMapSection v-if="locations.length" class="mt-5" :locations="locations" />
            </section>
          </div>

          <aside class="space-y-6">
            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <h2 class="text-xl font-bold text-slate-900">Summary</h2>
              <dl class="mt-5 space-y-4 text-sm">
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">Dates</dt>
                  <dd class="text-right font-semibold text-slate-900">{{ form.startDate || 'Start' }} → {{ form.endDate || 'End' }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">Participants</dt>
                  <dd class="font-semibold text-slate-900">{{ participantCount }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">Locations</dt>
                  <dd class="font-semibold text-slate-900">{{ locations.length }}</dd>
                </div>
              </dl>

              <div class="mt-6 rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
                <p class="font-semibold">Editing existing trip</p>
                <p class="mt-1">Participants and photos stay linked to the trip while you update the core itinerary.</p>
              </div>
            </section>

            <button type="submit" :disabled="saving" class="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-brand-200 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:translate-y-0 disabled:opacity-60">
              {{ saving ? 'Saving changes...' : 'Save changes' }}
            </button>
          </aside>
        </form>
      </div>
    </section>
  </main>
</template>
