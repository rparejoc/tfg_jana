import { createRouter, createWebHistory } from 'vue-router'
import AuthPage from '../pages/AuthPage.vue'
import FamilyPage from '../pages/FamilyPage.vue'
import CreateTripPage from '../pages/CreateTripPage.vue'
import TripDetailPage from '../pages/TripDetailPage.vue'
import { useAuthStore } from '../stores/authStore'

const routes = [
  {
    path: '/',
    name: 'auth',
    component: AuthPage,
    meta: { requiresGuest: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: FamilyPage,
    meta: { requiresAuth: true },
  },

  {
    path: '/trips/create',
    name: 'create-trip',
    component: CreateTripPage,
    meta: { requiresAuth: true },
  },
  {
    path: '/trip/:tripId',
    name: 'trip-detail',
    component: TripDetailPage,
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (authStore.loading) {
    return true
  }

  if (to.meta.requiresAuth && !authStore.user) {
    return { name: 'auth' }
  }

  if (to.meta.requiresGuest && authStore.user) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
