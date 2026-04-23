import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initAuthListener } from './stores/authStore'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

initAuthListener()

app.use(router)

app.mount('#app')
