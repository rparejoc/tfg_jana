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
      label: user.value.displayName || user.value.email || 'You',
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
  participant?.displayName || participant?.email || participant?.label || participant?.id || 'Unknown user'

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

const getPhotoIdFromStoragePath = (storagePath) =>
  storagePath?.split('/').pop()?.replace('.jpg', '') || null

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
      'Trip will be created, but some weather data could not be loaded.'
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
    error.value = 'You must be signed in to create a trip.'
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
    error.value = 'Selecciona o crea una familia activa antes de crear un viaje.'
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
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-white/75">Nuevo viaje familiar</p>
        <div class="mt-4 max-w-3xl">
          <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">Crea una aventura completa</h1>
          <p class="mt-3 text-base leading-7 text-white/85 sm:text-lg">
            Añade fechas, participantes, localizaciones con su tiempo previsto y recuerdos para que toda la familia tenga el viaje organizado desde el primer momento.
          </p>
        </div>
        <div class="mt-8 grid gap-3 text-sm sm:grid-cols-3">
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ selectedParticipants.length }}</p>
            <p class="text-white/75">participantes</p>
          </div>
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ locations.length }}</p>
            <p class="text-white/75">localizaciones</p>
          </div>
          <div class="rounded-2xl bg-white/15 p-4 backdrop-blur">
            <p class="font-semibold">{{ photoFiles.length }}</p>
            <p class="text-white/75">fotos iniciales</p>
          </div>
        </div>
      </div>

      <div class="bg-slate-50/80 px-6 py-8 sm:px-10">
        <p v-if="setupLoading" class="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">Cargando familia y participantes...</p>
        <p v-if="error" class="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
        <p v-if="uploadLoading" class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Uploading photos...</p>

        <form class="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]" @submit.prevent="handleSubmit">
          <div class="space-y-6">
            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Paso 1</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">Detalles del viaje</h2>
                </div>
                <span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Obligatorio</span>
              </div>

              <div class="mt-5 grid gap-5 sm:grid-cols-2">
                <div class="space-y-1.5 sm:col-span-2">
                  <label for="trip-title" class="text-sm font-medium text-slate-700">Título</label>
                  <input id="trip-title" v-model="form.title" type="text" placeholder="Vacaciones de verano" required :disabled="loading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>

                <div class="space-y-1.5 sm:col-span-2">
                  <label for="trip-description" class="text-sm font-medium text-slate-700">Descripción</label>
                  <textarea id="trip-description" v-model="form.description" placeholder="Un viaje familiar sencillo, con paradas, fotos y planes compartidos." :disabled="loading" class="min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100"></textarea>
                </div>

                <div class="space-y-1.5">
                  <label for="trip-start-date" class="text-sm font-medium text-slate-700">Fecha de inicio</label>
                  <input id="trip-start-date" v-model="form.startDate" type="date" required :disabled="loading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>

                <div class="space-y-1.5">
                  <label for="trip-end-date" class="text-sm font-medium text-slate-700">Fecha de fin</label>
                  <input id="trip-end-date" v-model="form.endDate" type="date" required :disabled="loading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                </div>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Paso 2</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">Participantes</h2>
                  <p class="mt-1 text-sm text-slate-500">Selecciona qué miembros de la familia formarán parte del viaje.</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ selectedParticipants.length }} seleccionados</span>
              </div>

              <p v-if="participantsLoading" class="mt-4 text-sm text-slate-500">Cargando participantes...</p>
              <p v-if="participantsError" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{{ participantsError }}</p>

              <div v-if="participantOptions.length" class="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  v-for="participant in participantOptions"
                  :key="participant.id"
                  type="button"
                  :disabled="loading || participant.id === user?.uid"
                  class="flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed"
                  :class="participant.selected ? 'border-brand-600 bg-brand-50 shadow-brand-100' : 'border-slate-200 bg-white'"
                  @click="toggleParticipant(participant.id)"
                >
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold" :class="participant.selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'">
                    {{ getParticipantName(participant).slice(0, 1).toUpperCase() }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-slate-900">{{ getParticipantName(participant) }}</span>
                    <span class="text-xs capitalize text-slate-500">{{ participant.id === user?.uid ? 'Creador incluido' : participant.role || 'member' }}</span>
                  </span>
                  <span class="rounded-full px-2 py-1 text-xs font-semibold" :class="participant.selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'">
                    {{ participant.selected ? 'Incluido' : 'Añadir' }}
                  </span>
                </button>
              </div>

              <p v-else-if="!participantsLoading" class="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">No hay miembros de familia disponibles todavía. El creador se añadirá automáticamente.</p>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Paso 3</p>
                  <h2 class="mt-1 text-xl font-bold text-slate-900">Localizaciones y tiempo</h2>
                  <p class="mt-1 text-sm text-slate-500">Busca destinos. Al guardar, cada localización conservará su previsión meteorológica asociada.</p>
                </div>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ locations.length }} añadidas</span>
              </div>

              <div class="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label for="trip-location-search" class="text-sm font-medium text-slate-700">Buscar localización</label>
                <div class="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input id="trip-location-search" v-model="locationQuery" type="text" placeholder="Buscar ciudad o lugar" :disabled="loading || locationLoading" class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none ring-brand-100 transition focus:border-brand-600 focus:ring-4 disabled:bg-slate-100" />
                  <button type="button" @click="handleLocationSearch" :disabled="loading || locationLoading" class="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60">{{ locationLoading ? 'Buscando...' : 'Buscar' }}</button>
                </div>

                <p v-if="locationError" class="mt-3 text-sm text-rose-600">{{ locationError }}</p>

                <ul v-if="locationResults.length" class="mt-4 space-y-2">
                  <li v-for="(result, index) in locationResults" :key="`${result.name}-${result.lat}-${result.lng}-${index}`" class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                    <span class="min-w-0">
                      <span class="block truncate font-semibold text-slate-800">{{ result.name }}</span>
                      <span class="text-xs text-slate-500">{{ result.country }} · {{ result.lat }}, {{ result.lng }}</span>
                    </span>
                    <button type="button" @click="addLocation(result)" :disabled="loading" class="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100">Seleccionar</button>
                  </li>
                </ul>
              </div>

              <div class="mt-5">
                <h3 class="text-sm font-semibold text-slate-900">Localizaciones añadidas</h3>
                <ul v-if="locations.length" class="mt-3 grid gap-3">
                  <li v-for="(location, index) in locations" :key="`${location.name}-${location.lat}-${location.lng}-${index}`" class="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <p class="font-semibold text-slate-900">{{ location.name }}<span v-if="location.country">, {{ location.country }}</span></p>
                      <p class="mt-1 text-xs text-slate-500">{{ location.lat }}, {{ location.lng }}</p>
                      <p class="mt-2 text-xs font-medium text-brand-700">El tiempo se guardará para la fecha de inicio del viaje.</p>
                    </div>
                    <button type="button" :disabled="loading" class="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50" @click="removeLocation(index)">Quitar</button>
                  </li>
                </ul>
                <p v-else class="mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Aún no has añadido localizaciones.</p>
              </div>

              <TripMapSection v-if="locations.length" class="mt-5" :locations="locations" />
            </section>
          </div>

          <aside class="space-y-6">
            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-6">
              <h2 class="text-xl font-bold text-slate-900">Resumen</h2>
              <dl class="mt-5 space-y-4 text-sm">
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">Fechas</dt>
                  <dd class="text-right font-semibold text-slate-900">{{ form.startDate || 'Inicio' }} → {{ form.endDate || 'Fin' }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">Participantes</dt>
                  <dd class="font-semibold text-slate-900">{{ selectedParticipants.length }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                  <dt class="text-slate-500">Localizaciones</dt>
                  <dd class="font-semibold text-slate-900">{{ locations.length }}</dd>
                </div>
              </dl>

              <div class="mt-6 rounded-2xl border border-dashed border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
                <p class="font-semibold">Tiempo por localización</p>
                <p class="mt-1">Al crear el viaje se consultará la previsión y se guardará dentro de cada destino.</p>
              </div>
            </section>

            <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 class="text-xl font-bold text-slate-900">Fotos iniciales</h2>
              <p class="mt-1 text-sm text-slate-500">Puedes adjuntar recuerdos ahora o añadirlos más adelante.</p>
              <div class="mt-4">
                <PhotoUploader :disabled="loading || uploadLoading" @update:selected-files="handlePhotosSelected" />
              </div>
            </section>

            <button type="submit" :disabled="loading || uploadLoading || setupLoading" class="w-full rounded-2xl bg-brand-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-brand-200 transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:translate-y-0 disabled:opacity-60">
              {{ loading || uploadLoading ? 'Creando viaje...' : 'Crear viaje' }}
            </button>
          </aside>
        </form>
      </div>
    </section>
  </main>
</template>
