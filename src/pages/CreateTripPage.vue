<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import familyService from '../services/familyService'
import tripService from '../services/tripService'
import userService from '../services/userService'
import geocodingService from '../services/geocodingService'
import weatherService from '../services/weatherService'
import { useAuthStore } from '../stores/authStore'
import { db } from '../firebase'
import TripMapSection from '../components/TripMapSection.vue'
import PhotoUploader from '../components/PhotoUploader.vue'
import photoService from '../services/photoService'
import { usePreferences } from '../composables/usePreferences'

const router = useRouter()
const authStore = useAuthStore()
const { user, currentUserContext } = storeToRefs(authStore)
const { t } = usePreferences()

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

const familyMembers = ref([])
const selectedParticipantIds = ref([])
const participantsLoading = ref(false)
const participantsError = ref('')
const activeProfile = ref(null)

const loading = ref(false)
const setupLoading = ref(false)
const uploadLoading = ref(false)
const error = ref('')
const photoFiles = ref([])

const participantOptions = computed(() => {
  const knownParticipants = familyMembers.value.map((member) => ({
    ...member,
    selected: selectedParticipantIds.value.includes(member.id),
  }))

  if (
    user.value?.uid &&
    !knownParticipants.some((participant) => participant.id === user.value.uid)
  ) {
    knownParticipants.unshift({
      id: user.value.uid,
      role: 'member',
      displayName: user.value.displayName || null,
      email: user.value.email || null,
      label: user.value.displayName || user.value.email || t('auth.email'),
      selected: selectedParticipantIds.value.includes(user.value.uid),
    })
  }

  return knownParticipants
})

const selectedParticipants = computed(() =>
  participantOptions.value.filter((participant) =>
    selectedParticipantIds.value.includes(participant.id),
  ),
)

const getParticipantName = (participant) =>
  participant?.displayName || participant?.email || participant?.label || participant?.id || t('nav.noEmail')

const getParticipantRoleLabel = (participant) => {
  if (participant?.id === user.value?.uid) {
    return t('trip.create.creatorIncluded')
  }

  return t(`role.${participant?.role || 'member'}`)
}

const normalizeSelectedParticipants = () => {
  if (!user.value?.uid) {
    return
  }

  selectedParticipantIds.value = Array.from(
    new Set([user.value.uid, ...selectedParticipantIds.value]),
  )
}

const loadFamilyParticipants = async (familyId) => {
  if (!familyId) {
    familyMembers.value = []
    return
  }

  participantsLoading.value = true
  participantsError.value = ''

  const { members, error: membersError } = await familyService.getFamilyMembers(familyId)

  if (membersError) {
    participantsError.value = membersError.message
    familyMembers.value = []
    participantsLoading.value = false
    normalizeSelectedParticipants()
    return
  }

  const membersWithProfiles = await Promise.all(
    members.map(async (member) => {
      const { profile } = await userService.getUserProfile(member.id)
      const displayName = profile?.displayName || null
      const email = profile?.email || null

      return {
        ...member,
        displayName,
        email,
        label: displayName || email || member.id,
      }
    }),
  )

  familyMembers.value = membersWithProfiles
  normalizeSelectedParticipants()
  participantsLoading.value = false
}

const loadCreationContext = async () => {
  if (!user.value?.uid) {
    return
  }

  setupLoading.value = true
  error.value = ''

  const { profile, error: profileError } = await userService.getUserProfile(user.value.uid)

  if (profileError) {
    error.value = profileError.message
    setupLoading.value = false
    return
  }

  activeProfile.value = profile

  if (profile) {
    authStore.setProfile(profile)
  }

  selectedParticipantIds.value = [user.value.uid]

  if (profile?.activeFamilyId) {
    await loadFamilyParticipants(profile.activeFamilyId)
  }

  setupLoading.value = false
}

const handleLocationSearch = async () => {
  if (!locationQuery.value.trim()) {
    locationResults.value = []
    locationError.value = t('trip.common.typeLocation')
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
    locationError.value = t('trip.common.noResults')
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
    locationError.value = t('trip.common.duplicateLocation')
    return
  }

  locations.value.push({
    name: location.name,
    country: location.country,
    lat: location.lat,
    lng: location.lng,
    weather: null,
  })

  locationQuery.value = ''
  locationResults.value = []
  locationError.value = ''
}

const removeLocation = (index) => {
  locations.value.splice(index, 1)
}

const toggleParticipant = (participantId) => {
  if (!participantId || participantId === user.value?.uid) {
    normalizeSelectedParticipants()
    return
  }

  if (selectedParticipantIds.value.includes(participantId)) {
    selectedParticipantIds.value = selectedParticipantIds.value.filter((id) => id !== participantId)
    return
  }

  selectedParticipantIds.value = [...selectedParticipantIds.value, participantId]
}

const handlePhotosSelected = (selectedFiles) => {
  photoFiles.value = selectedFiles
}

const buildLocationsWithWeather = async () => {
  const weatherDate = form.startDate || new Date().toISOString().slice(0, 10)
  const enrichedLocations = []
  const weatherSnapshots = []
  let hasFailures = false

  for (const location of locations.value) {
    const { weather, error: weatherError } = await weatherService.getWeather(
      location.lat,
      location.lng,
      weatherDate,
      location.name,
    )

    const locationWithWeather = {
      ...location,
      weather,
    }

    enrichedLocations.push(locationWithWeather)
    weatherSnapshots.push(weather)

    if (weatherError) {
      hasFailures = true
    }
  }

  if (hasFailures) {
    error.value =
      t('trip.create.weatherPartialError')
  }

  return { enrichedLocations, weatherSnapshots }
}

const getCreationProfile = async () => {
  if (activeProfile.value) {
    return { profile: activeProfile.value, profileError: null }
  }

  const { profile, error: profileError } = await userService.getUserProfile(user.value.uid)
  activeProfile.value = profile

  if (profile) {
    authStore.setProfile(profile)
  }

  return { profile, profileError }
}

const handleSubmit = async () => {
  if (!user.value?.uid) {
    error.value = t('trip.create.mustSignIn')
    return
  }

  loading.value = true
  error.value = ''
  normalizeSelectedParticipants()

  const { profile, profileError } = await getCreationProfile()

  if (profileError) {
    error.value = profileError.message
    loading.value = false
    return
  }

  if (!profile?.activeFamilyId) {
    error.value = t('trip.create.noActiveFamily')
    loading.value = false
    return
  }

  if (!familyMembers.value.length) {
    await loadFamilyParticipants(profile.activeFamilyId)
  }

  const fallbackContext = {
    uid: user.value.uid,
    displayName: user.value.displayName || null,
    email: user.value.email || null,
    activeFamilyId: profile.activeFamilyId,
  }

  const { enrichedLocations, weatherSnapshots } = await buildLocationsWithWeather()
  const participantIds = selectedParticipantIds.value
  const participantNames = participantIds.map((participantId) => {
    const participant = participantOptions.value.find((option) => option.id === participantId)
    return getParticipantName(participant)
  })

  const { tripId, error: createError } = await tripService.createTrip(
    {
      ...form,
      locations: enrichedLocations,
      weather: weatherSnapshots,
      participantIds,
      participantNames,
    },
    currentUserContext.value || fallbackContext,
  )

  if (createError || !tripId) {
    error.value = createError?.message || t('trip.create.unableCreate')
    loading.value = false
    return
  }

  if (photoFiles.value.length) {
    uploadLoading.value = true

    try {
      let uploadedCount = 0
      const uploadErrors = []

      for (const file of photoFiles.value) {
        const { photoId, url, storagePath, error: uploadError } = await photoService.uploadPhoto(
          file,
          user.value,
          tripId,
          profile.activeFamilyId,
        )

        if (uploadError || !photoId || !url || !storagePath) {
          const reason = uploadError?.message ? `: ${uploadError.message}` : ''
          uploadErrors.push(`${file.name}${reason}`)
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
        const failedUploads = uploadErrors.slice(0, 3).join('; ')
        const remainingFailures =
          uploadErrors.length > 3 ? t('trip.create.moreFailures', { count: uploadErrors.length - 3 }) : ''

        error.value = t('trip.create.uploadPartial', { count: uploadErrors.length, failures: failedUploads, remaining: remainingFailures })
        loading.value = false
        uploadLoading.value = false
        return
      }
    } catch (uploadProcessError) {
      error.value = uploadProcessError?.message || t('trip.create.photoProcessingFailed')
      loading.value = false
      uploadLoading.value = false
      return
    }

    uploadLoading.value = false
  }

  await router.push('/dashboard')
}

onMounted(() => {
  loadCreationContext()
})

watch(
  user,
  (currentUser) => {
    if (currentUser?.uid && currentUser.uid !== activeProfile.value?.id) {
      loadCreationContext()
    }
  },
)
</script>

<template>
  <main class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
    <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div class="relative isolate bg-gradient-to-br from-brand-700 via-brand-600 to-sky-500 px-6 py-10 text-white sm:px-10">
        <div class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.35),transparent_32rem)]"></div>
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">{{ t('trip.create.eyebrow') }}</p>
        <div class="mt-4 max-w-3xl">
          <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">{{ t('trip.create.title') }}</h1>
          <p class="mt-3 text-base leading-7 text-white/85 sm:text-lg">
            {{ t('trip.create.subtitle') }}
          </p>
        </div>
        <div class="mt-8 grid gap-3 text-sm sm:grid-cols-3">
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ selectedParticipants.length }}</p>
            <p class="text-white/75">{{ t('trip.common.participants') }}</p>
          </div>
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ locations.length }}</p>
            <p class="text-white/75">{{ t('trip.common.locations') }}</p>
          </div>
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ photoFiles.length }}</p>
            <p class="text-white/75">{{ t('trip.common.initialPhotos') }}</p>
          </div>
        </div>
      </div>

      <div class="bg-slate-50/80 px-6 py-8 sm:px-10">
        <p v-if="setupLoading" class="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">{{ t('trip.create.loadingContext') }}</p>
        <p v-if="error" class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
        <p v-if="uploadLoading" class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{{ t('trip.create.uploadingPhotos') }}</p>

        <form class="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]" @submit.prevent="handleSubmit">
          <div class="space-y-6">
            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{{ t('trip.common.step', { number: 1 }) }}</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">{{ t('trip.common.details') }}</h2>
                </div>
                <span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{{ t('trip.common.required') }}</span>
              </div>

              <div class="mt-5 grid gap-5 sm:grid-cols-2">
                <div class="space-y-1.5 sm:col-span-2">
                  <label for="trip-title" class="text-sm font-medium text-slate-700">{{ t('trip.common.title') }}</label>
                  <input id="trip-title" v-model="form.title" type="text" :placeholder="t('trip.common.titlePlaceholder')" required :disabled="loading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>

                <div class="space-y-1.5 sm:col-span-2">
                  <label for="trip-description" class="text-sm font-medium text-slate-700">{{ t('trip.common.description') }}</label>
                  <textarea id="trip-description" v-model="form.description" :placeholder="t('trip.common.descriptionPlaceholder')" :disabled="loading" class="min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100"></textarea>
                </div>

                <div class="space-y-1.5">
                  <label for="trip-start-date" class="text-sm font-medium text-slate-700">{{ t('trip.common.startDate') }}</label>
                  <input id="trip-start-date" v-model="form.startDate" type="date" required :disabled="loading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>

                <div class="space-y-1.5">
                  <label for="trip-end-date" class="text-sm font-medium text-slate-700">{{ t('trip.common.endDate') }}</label>
                  <input id="trip-end-date" v-model="form.endDate" type="date" required :disabled="loading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{{ t('trip.common.step', { number: 2 }) }}</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">{{ t('trip.common.participants') }}</h2>
                  <p class="mt-1 text-sm text-slate-500">{{ t('trip.create.participantsHelp') }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ t('trip.create.selectedCount', { count: selectedParticipants.length }) }}</span>
              </div>

              <p v-if="participantsLoading" class="mt-4 text-sm text-slate-500">{{ t('trip.create.loadingParticipants') }}</p>
              <p v-if="participantsError" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{{ participantsError }}</p>

              <div v-if="participantOptions.length" class="mt-5 grid gap-3 2xl:grid-cols-2">
                <button
                  v-for="participant in participantOptions"
                  :key="participant.id"
                  type="button"
                  :disabled="loading || participant.id === user?.uid"
                  class="grid w-full grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed"
                  :class="participant.selected ? 'border-brand-600 bg-brand-50 shadow-brand-100' : 'border-slate-200 bg-white'"
                  @click="toggleParticipant(participant.id)"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold" :class="participant.selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'">
                    {{ getParticipantName(participant).slice(0, 1).toUpperCase() }}
                  </span>
                  <span class="min-w-0">
                    <span class="block break-words text-sm font-semibold leading-5 text-slate-900">{{ getParticipantName(participant) }}</span>
                    <span class="mt-1 block break-words text-xs capitalize leading-4 text-slate-500">{{ getParticipantRoleLabel(participant) }}</span>
                  </span>
                  <span class="col-start-2 w-fit rounded-full px-2 py-1 text-xs font-semibold" :class="participant.selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'">
                    {{ participant.selected ? t('trip.create.included') : t('trip.create.add') }}
                  </span>
                </button>
              </div>

              <p v-else-if="!participantsLoading" class="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{{ t('trip.create.noParticipants') }}</p>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">{{ t('trip.common.step', { number: 3 }) }}</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">{{ t('trip.common.locationsWeather') }}</h2>
                  <p class="mt-1 text-sm text-slate-500">{{ t('trip.create.locationsHelp') }}</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ t('trip.common.addedCount', { count: locations.length }) }}</span>
              </div>

              <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label for="trip-location-search" class="text-sm font-medium text-slate-700">{{ t('trip.common.searchLocation') }}</label>
                <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input id="trip-location-search" v-model="locationQuery" type="text" :placeholder="t('trip.common.searchPlaceholder')" :disabled="loading || locationLoading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                  <button type="button" @click="handleLocationSearch" :disabled="loading || locationLoading" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60">{{ locationLoading ? t('trip.common.searching') : t('trip.common.search') }}</button>
                </div>

                <p v-if="locationError" class="mt-3 text-sm text-rose-600">{{ locationError }}</p>

                <ul v-if="locationResults.length" class="mt-4 space-y-2">
                  <li v-for="(result, index) in locationResults" :key="`${result.name}-${result.lat}-${result.lng}-${index}`" class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <span class="min-w-0">
                      <span class="block truncate font-semibold text-slate-800">{{ result.name }}</span>
                      <span class="text-xs text-slate-500">{{ result.country }} · {{ result.lat }}, {{ result.lng }}</span>
                    </span>
                    <button type="button" @click="addLocation(result)" :disabled="loading" class="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100">{{ t('trip.common.select') }}</button>
                  </li>
                </ul>
              </div>

              <div class="mt-5">
                <h3 class="text-sm font-semibold text-slate-900">{{ t('trip.common.addedLocations') }}</h3>
                <ul v-if="locations.length" class="mt-3 grid gap-3">
                  <li v-for="(location, index) in locations" :key="`${location.name}-${location.lat}-${location.lng}-${index}`" class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <p class="font-semibold text-slate-900">{{ location.name }}<span v-if="location.country">, {{ location.country }}</span></p>
                      <p class="mt-1 text-xs text-slate-500">{{ location.lat }}, {{ location.lng }}</p>
                      <p class="mt-2 text-xs font-medium text-brand-700">{{ t('trip.create.weatherSaved') }}</p>
                    </div>
                    <button type="button" :disabled="loading" class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="removeLocation(index)">{{ t('trip.common.remove') }}</button>
                  </li>
                </ul>
                <p v-else class="mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{{ t('trip.common.noLocations') }}</p>
              </div>

              <TripMapSection v-if="locations.length" class="mt-5" :locations="locations" />
            </section>
          </div>

          <aside class="space-y-6">
            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <h2 class="text-xl font-bold text-slate-900">{{ t('trip.common.summary') }}</h2>
              <dl class="mt-5 space-y-4 text-sm">
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">{{ t('trip.common.dates') }}</dt>
                  <dd class="text-right font-semibold text-slate-900">{{ form.startDate || t('trip.common.start') }} → {{ form.endDate || t('trip.common.end') }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">{{ t('trip.common.participants') }}</dt>
                  <dd class="font-semibold text-slate-900">{{ selectedParticipants.length }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">{{ t('trip.common.locations') }}</dt>
                  <dd class="font-semibold text-slate-900">{{ locations.length }}</dd>
                </div>
              </dl>

              <div class="mt-6 rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
                <p class="font-semibold">{{ t('trip.create.weatherBoxTitle') }}</p>
                <p class="mt-1">{{ t('trip.create.weatherBoxHelp') }}</p>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 class="text-xl font-bold text-slate-900">{{ t('trip.create.initialPhotosTitle') }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ t('trip.create.initialPhotosHelp') }}</p>
              <div class="mt-4">
                <PhotoUploader :disabled="loading || uploadLoading" @update:selected-files="handlePhotosSelected" />
              </div>
            </section>

            <button type="submit" :disabled="loading || uploadLoading || setupLoading" class="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-brand-200 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:translate-y-0 disabled:opacity-60">
              {{ loading || uploadLoading ? t('trip.create.creating') : t('trip.create.submit') }}
            </button>
          </aside>
        </form>
      </div>
    </section>
  </main>
</template>
