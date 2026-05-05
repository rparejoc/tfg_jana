<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import familyService from '../services/familyService'
import userService from '../services/userService'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const loading = ref(false)
const error = ref('')
const profile = ref(null)
const families = ref([])

const createFamilyName = ref('')
const inviteCode = ref('')
const createLoading = ref(false)
const joinLoading = ref(false)

const hasFamilies = computed(() => families.value.length > 0)
const activeFamilyId = computed(() => profile.value?.activeFamilyId || null)

const syncFamiliesFromProfile = async () => {
  const familyIds = profile.value?.familyIds || []

  if (!familyIds.length) {
    families.value = []
    return
  }

  const familyItems = await Promise.all(
    familyIds.map(async (familyId) => {
      const { members, error: membersError } = await familyService.getFamilyMembers(familyId)

      return {
        id: familyId,
        members,
        membersError,
      }
    }),
  )

  families.value = familyItems
}

const loadUserData = async () => {
  if (!user.value?.uid) {
    return
  }

  loading.value = true
  error.value = ''

  const { profile: userProfile, error: profileError } = await userService.getUserProfile(user.value.uid)

  if (profileError) {
    error.value = profileError.message
    loading.value = false
    return
  }

  profile.value = userProfile || {
    id: user.value.uid,
    familyIds: [],
    activeFamilyId: null,
  }

  await syncFamiliesFromProfile()

  loading.value = false
}

const handleCreateFamily = async () => {
  if (!createFamilyName.value.trim() || !user.value) {
    return
  }

  createLoading.value = true
  error.value = ''

  const { familyId, error: createError } = await familyService.createFamily(
    createFamilyName.value,
    user.value,
  )

  if (createError) {
    error.value = createError.message
    createLoading.value = false
    return
  }

  const familyIds = profile.value?.familyIds || []

  profile.value = {
    ...(profile.value || {}),
    familyIds: familyIds.includes(familyId) ? familyIds : [...familyIds, familyId],
    activeFamilyId: familyId,
  }

  createFamilyName.value = ''
  await syncFamiliesFromProfile()
  createLoading.value = false
}

const handleJoinFamily = async () => {
  if (!inviteCode.value.trim() || !user.value) {
    return
  }

  joinLoading.value = true
  error.value = ''

  const { familyId, error: joinError } = await familyService.joinFamily(inviteCode.value, user.value)

  if (joinError) {
    error.value = joinError.message
    joinLoading.value = false
    return
  }

  const familyIds = profile.value?.familyIds || []

  profile.value = {
    ...(profile.value || {}),
    familyIds: familyIds.includes(familyId) ? familyIds : [...familyIds, familyId],
    activeFamilyId: familyId,
  }

  inviteCode.value = ''
  await syncFamiliesFromProfile()
  joinLoading.value = false
}

const handleSwitchActiveFamily = async (familyId) => {
  if (!familyId || !user.value?.uid) {
    return
  }

  loading.value = true
  error.value = ''

  const { error: activeError } = await userService.setActiveFamilyId(user.value.uid, familyId)

  if (activeError) {
    error.value = activeError.message
    loading.value = false
    return
  }

  profile.value = {
    ...(profile.value || {}),
    activeFamilyId: familyId,
  }

  loading.value = false
}

onMounted(() => {
  loadUserData()
})

watch(
  user,
  (currentUser) => {
    if (currentUser?.uid) {
      loadUserData()
    }
  },
)
</script>

<template>
  <main class="space-y-6">
    <header class="overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-amber-50 shadow-sm">
      <div class="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Family hub</p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight text-slate-950">Organiza tus familias</h1>
          <p class="mt-2 text-sm leading-6 text-slate-600">
            Crea un grupo, únete con un código o cambia la familia activa antes de planificar el siguiente viaje.
          </p>
        </div>
        <router-link
          to="/trips/create"
          class="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200"
        >
          + Crear viaje
        </router-link>
      </div>
    </header>

    <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-600 shadow-sm">
      Cargando familias...
    </div>
    <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700 shadow-sm">
      {{ error }}
    </div>

    <section v-if="!loading" class="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div class="space-y-5">
        <article v-if="!hasFamilies" class="rounded-3xl border border-dashed border-brand-200 bg-white p-6 text-center shadow-sm">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-2xl">👨‍👩‍👧‍👦</div>
          <h2 class="mt-4 text-xl font-bold text-slate-950">Aún no tienes familia activa</h2>
          <p class="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Empieza creando una familia nueva o pega el código que te hayan enviado para unirte a una existente.
          </p>
        </article>

        <article v-else class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Tus grupos</p>
              <h2 class="text-2xl font-bold text-slate-950">Familias disponibles</h2>
            </div>
            <span class="w-fit rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              {{ families.length }} {{ families.length === 1 ? 'familia' : 'familias' }}
            </span>
          </div>

          <ul class="mt-5 grid gap-4 lg:grid-cols-2">
            <li
              v-for="family in families"
              :key="family.id"
              class="rounded-2xl border p-4 transition"
              :class="family.id === activeFamilyId ? 'border-brand-300 bg-brand-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-brand-200'"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide"
                    :class="family.id === activeFamilyId ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ family.id === activeFamilyId ? 'Activa' : 'Disponible' }}
                  </span>
                  <h3 class="mt-3 break-all text-lg font-bold text-slate-950">{{ family.id }}</h3>
                </div>
                <div class="rounded-2xl bg-white px-3 py-2 text-center shadow-sm ring-1 ring-slate-100">
                  <p class="text-2xl font-bold text-slate-950">{{ family.members.length }}</p>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">miembros</p>
                </div>
              </div>

              <p v-if="family.membersError" class="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                No se pudieron cargar los miembros.
              </p>

              <button
                type="button"
                class="mt-4 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                :class="family.id === activeFamilyId ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-brand-700'"
                :disabled="family.id === activeFamilyId"
                @click="handleSwitchActiveFamily(family.id)"
              >
                {{ family.id === activeFamilyId ? 'Ya es la familia activa' : 'Cambiar a esta familia' }}
              </button>
            </li>
          </ul>
        </article>
      </div>

      <aside class="space-y-4">
        <form class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="handleCreateFamily">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-xl">＋</div>
            <div>
              <h2 class="text-lg font-bold text-slate-950">Crear familia</h2>
              <p class="text-sm text-slate-500">Un grupo nuevo para tus viajes.</p>
            </div>
          </div>

          <label class="mt-5 block text-sm font-bold text-slate-700" for="family-name">Nombre de la familia</label>
          <input
            id="family-name"
            v-model="createFamilyName"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100"
            type="text"
            placeholder="Familia García"
            required
            :disabled="createLoading || joinLoading || !user?.uid"
          />
          <button
            type="submit"
            class="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="createLoading || joinLoading || !user?.uid"
          >
            {{ createLoading ? 'Creando...' : 'Crear familia' }}
          </button>
        </form>

        <form class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="handleJoinFamily">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl">⌁</div>
            <div>
              <h2 class="text-lg font-bold text-slate-950">Unirte con código</h2>
              <p class="text-sm text-slate-500">Pega el código de invitación.</p>
            </div>
          </div>

          <label class="mt-5 block text-sm font-bold text-slate-700" for="invite-code">Código de invitación</label>
          <input
            id="invite-code"
            v-model="inviteCode"
            class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-mono uppercase tracking-wider text-slate-900 shadow-sm outline-none transition placeholder:tracking-normal placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-100"
            type="text"
            placeholder="ABC123"
            required
            :disabled="createLoading || joinLoading || !user?.uid"
          />
          <button
            type="submit"
            class="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-3 text-sm font-bold text-brand-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            :disabled="createLoading || joinLoading || !user?.uid"
          >
            {{ joinLoading ? 'Uniendo...' : 'Unirme a familia' }}
          </button>
        </form>
      </aside>
    </section>
  </main>
</template>
