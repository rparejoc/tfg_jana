import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase'

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use': 'This email is already in use.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/operation-not-allowed': 'Email and password accounts are not enabled.',
  'auth/weak-password': 'Password must be at least 6 characters long.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed':
    'Network error. Please check your internet connection and try again.',
}

const toAuthError = (error, fallbackMessage) => {
  const message = AUTH_ERROR_MESSAGES[error?.code] || fallbackMessage

  return {
    code: error?.code || 'auth/unknown',
    message,
    originalError: error,
  }
}

export const register = async (email, password) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)

    return { user: credential.user, error: null }
  } catch (error) {
    return {
      user: null,
      error: toAuthError(error, 'Unable to create your account right now.'),
    }
  }
}

export const login = async (email, password) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)

    return { user: credential.user, error: null }
  } catch (error) {
    return {
      user: null,
      error: toAuthError(error, 'Unable to sign in right now.'),
    }
  }
}

export const logout = async () => {
  try {
    await signOut(auth)

    return { error: null }
  } catch (error) {
    return {
      error: toAuthError(error, 'Unable to sign out right now.'),
    }
  }
}

export const getCurrentUser = () => auth.currentUser

export const subscribeToAuthChanges = (callback) => onAuthStateChanged(auth, callback)

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
  subscribeToAuthChanges,
}

export default authService
