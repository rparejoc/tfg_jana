import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const toUserServiceError = (error, fallbackMessage) => ({
  code: error?.code || 'firestore/unknown',
  message: fallbackMessage,
  originalError: error,
})

const getRequiredUserId = (user) => {
  const userId = user?.uid

  if (!userId) {
    throw new Error('A valid user with uid is required.')
  }

  return userId
}

export const createUserProfile = async (user) => {
  try {
    const userId = getRequiredUserId(user)

    const userRef = doc(db, 'users', userId)
    const payload = {
      displayName: user?.displayName || null,
      email: user?.email || null,
      createdAt: serverTimestamp(),
      familyIds: [],
      activeFamilyId: null,
    }

    await setDoc(userRef, payload, { merge: true })

    return { profile: { id: userId, ...payload }, error: null }
  } catch (error) {
    return {
      profile: null,
      error: toUserServiceError(error, 'Unable to create user profile right now.'),
    }
  }
}

export const getUserProfile = async (userId) => {
  if (!userId) {
    return {
      profile: null,
      error: toUserServiceError(null, 'A valid userId is required.'),
    }
  }

  try {
    const userRef = doc(db, 'users', userId)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
      return { profile: null, error: null }
    }

    return {
      profile: {
        id: snapshot.id,
        ...snapshot.data(),
      },
      error: null,
    }
  } catch (error) {
    return {
      profile: null,
      error: toUserServiceError(error, 'Unable to fetch user profile right now.'),
    }
  }
}


export const setActiveFamilyId = async (userId, familyId) => {
  if (!userId || !familyId) {
    return {
      error: toUserServiceError(null, 'A valid userId and familyId are required.'),
    }
  }

  try {
    const userRef = doc(db, 'users', userId)

    await updateDoc(userRef, {
      activeFamilyId: familyId,
    })

    return { error: null }
  } catch (error) {
    return {
      error: toUserServiceError(error, 'Unable to set active family right now.'),
    }
  }
}

const userService = {
  createUserProfile,
  getUserProfile,
  setActiveFamilyId,
}

export default userService
