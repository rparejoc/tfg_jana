import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const defaultFirebaseConfig = {
  apiKey: 'AIzaSyCdltqZvWaExH-WvbWEfwex9NVpzJcASzU',
  authDomain: 'tfg-jana.firebaseapp.com',
  projectId: 'tfg-jana',
  messagingSenderId: '374363208689',
  appId: '1:374363208689:web:90711e2dd1e7554c12e250',
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
}

const app = initializeApp(firebaseConfig)

const auth = getAuth(app)
const db = getFirestore(app)
export { auth, db }
