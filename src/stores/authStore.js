import { defineStore } from 'pinia'
import { subscribeToAuth } from '../services/authService'

let unsubscribeAuthListener = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    loading: true,
  }),
  actions: {
    setUser(user) {
      this.user = user
    },
    clearUser() {
      this.user = null
    },
  },
})

export const initAuthListener = () => {
  if (unsubscribeAuthListener) {
    return unsubscribeAuthListener
  }

  const authStore = useAuthStore()

  unsubscribeAuthListener = subscribeToAuth((user) => {
    if (user) {
      authStore.setUser(user)
    } else {
      authStore.clearUser()
    }

    authStore.loading = false
  })

  return unsubscribeAuthListener
}
