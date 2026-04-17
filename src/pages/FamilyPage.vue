<script setup>
import { computed, onMounted, ref } from 'vue'
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
</script>

<template>
  <main>
    <h1>Family Management</h1>

    <p v-if="loading">Loading...</p>
    <p v-if="error">{{ error }}</p>

    <section v-if="!loading && !hasFamilies">
      <h2>Create Family</h2>
      <form @submit.prevent="handleCreateFamily">
        <label for="family-name">Family name</label>
        <input
          id="family-name"
          v-model="createFamilyName"
          type="text"
          placeholder="My family"
          required
          :disabled="createLoading || joinLoading"
        />
        <button type="submit" :disabled="createLoading || joinLoading">
          {{ createLoading ? 'Creating...' : 'Create family' }}
        </button>
      </form>

      <h2>Join Family</h2>
      <form @submit.prevent="handleJoinFamily">
        <label for="invite-code">Invite code</label>
        <input
          id="invite-code"
          v-model="inviteCode"
          type="text"
          placeholder="ABC123"
          required
          :disabled="createLoading || joinLoading"
        />
        <button type="submit" :disabled="createLoading || joinLoading">
          {{ joinLoading ? 'Joining...' : 'Join family' }}
        </button>
      </form>
    </section>

    <section v-else-if="!loading">
      <h2>Your Families</h2>
      <ul>
        <li v-for="family in families" :key="family.id">
          <strong>
            {{ family.id }}
            <span v-if="family.id === activeFamilyId">(Active)</span>
          </strong>
          <p>
            Members: {{ family.members.length }}
            <span v-if="family.membersError"> - Unable to load members.</span>
          </p>
          <button
            type="button"
            :disabled="family.id === activeFamilyId"
            @click="handleSwitchActiveFamily(family.id)"
          >
            Switch active family
          </button>
        </li>
      </ul>

      <h3>Create another family</h3>
      <form @submit.prevent="handleCreateFamily">
        <label for="family-name-inline">Family name</label>
        <input
          id="family-name-inline"
          v-model="createFamilyName"
          type="text"
          placeholder="Another family"
          required
          :disabled="createLoading || joinLoading"
        />
        <button type="submit" :disabled="createLoading || joinLoading">
          {{ createLoading ? 'Creating...' : 'Create family' }}
        </button>
      </form>

      <h3>Join another family</h3>
      <form @submit.prevent="handleJoinFamily">
        <label for="invite-code-inline">Invite code</label>
        <input
          id="invite-code-inline"
          v-model="inviteCode"
          type="text"
          placeholder="ABC123"
          required
          :disabled="createLoading || joinLoading"
        />
        <button type="submit" :disabled="createLoading || joinLoading">
          {{ joinLoading ? 'Joining...' : 'Join family' }}
        </button>
      </form>
    </section>
  </main>
</template>
