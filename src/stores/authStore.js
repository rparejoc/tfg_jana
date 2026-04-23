import { defineStore } from 'pinia'
import { subscribeToAuth } from '../services/authService'
import userService from '../services/userService'

let unsubscribeAuthListener = null

const buildCurrentUserContext = (user, profile) => {
  if (!user?.uid || !profile?.activeFamilyId) {
    return null
  }

  return {
    uid: user.uid,
    displayName: user.displayName || null,
    email: user.email || null,
    activeFamilyId: profile.activeFamilyId,
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    profile: null,
    loading: true,
  }),
  getters: {
    currentUserContext(state) {
      return buildCurrentUserContext(state.user, state.profile)
    },
  },
  actions: {
    setUser(user) {
      this.user = user
    },
    setProfile(profile) {
      this.profile = profile
    },
    clearUser() {
      this.user = null
      this.profile = null
    },
    async loadUserProfile() {
      if (!this.user?.uid) {
        this.profile = null
        return
      }

      const { profile, error } = await userService.getUserProfile(this.user.uid)

      if (error) {
        throw new Error(error.message)
      }

      if (!profile) {
        const { profile: createdProfile, error: createError } = await userService.createUserProfile(this.user)

        if (createError) {
          throw new Error(createError.message)
        }

        this.profile = createdProfile
        return
      }

      this.profile = profile
    },
  },
})

export const initAuthListener = () => {
  if (unsubscribeAuthListener) {
    return unsubscribeAuthListener
  }

  const authStore = useAuthStore()

  unsubscribeAuthListener = subscribeToAuth(async (user) => {
    try {
      if (user) {
        authStore.setUser(user)
        await authStore.loadUserProfile()
      } else {
        authStore.clearUser()
      }
    } catch {
      authStore.profile = null
    } finally {
      authStore.loading = false
    }
  })

  return unsubscribeAuthListener
}
