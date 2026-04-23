import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'

const toTripServiceError = (error, fallbackMessage) => ({
  code: error?.code || 'firestore/unknown',
  message: fallbackMessage,
  originalError: error,
})

const getRequiredUser = (user) => {
  if (!user?.uid) {
    throw new Error('A valid user with uid is required.')
  }

  if (!user?.activeFamilyId) {
    throw new Error('A valid user with activeFamilyId is required.')
  }

  return user
}

export const createTrip = async (tripData, user) => {
  try {
    const authUser = getRequiredUser(user)

    if (!tripData?.title?.trim()) {
      throw new Error('Trip title is required.')
    }

    const tripsRef = collection(db, 'trips')
    const tripDoc = await addDoc(tripsRef, {
      familyId: authUser.activeFamilyId,
      createdBy: authUser.uid,
      title: tripData.title.trim(),
      description: tripData?.description?.trim() || '',
      startDate: tripData?.startDate || null,
      endDate: tripData?.endDate || null,
      participantIds: [authUser.uid],
      participantNames: [authUser.displayName || authUser.email || 'Unknown User'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      locations: Array.isArray(tripData?.locations) ? tripData.locations : [],
      weather: Array.isArray(tripData?.weather) ? tripData.weather : [],
      photoCount: 0,
    })

    return { tripId: tripDoc.id, error: null }
  } catch (error) {
    return {
      tripId: null,
      error: toTripServiceError(error, 'Unable to create trip right now.'),
    }
  }
}



export const getTripById = async (tripId) => {
  if (!tripId) {
    return {
      trip: null,
      photos: [],
      error: toTripServiceError(null, 'A valid tripId is required.'),
    }
  }

  try {
    const tripRef = doc(db, 'trips', tripId)
    const tripSnapshot = await getDoc(tripRef)

    if (!tripSnapshot.exists()) {
      return {
        trip: null,
        photos: [],
        error: toTripServiceError(null, 'Trip not found.'),
      }
    }

    const photosSnapshot = await getDocs(collection(db, 'trips', tripId, 'photos'))
    const photos = photosSnapshot.docs.map((photoDoc) => ({
      id: photoDoc.id,
      ...photoDoc.data(),
    }))

    return {
      trip: {
        id: tripSnapshot.id,
        ...tripSnapshot.data(),
      },
      photos,
      error: null,
    }
  } catch (error) {
    return {
      trip: null,
      photos: [],
      error: toTripServiceError(error, 'Unable to fetch trip details right now.'),
    }
  }
}

export const getTripsByFamily = async (familyId) => {
  if (!familyId) {
    return {
      trips: [],
      error: toTripServiceError(null, 'A valid familyId is required.'),
    }
  }

  try {
    const tripsRef = collection(db, 'trips')
    const tripsQuery = query(tripsRef, where('familyId', '==', familyId))
    const snapshot = await getDocs(tripsQuery)

    const trips = snapshot.docs.map((tripDoc) => ({
      id: tripDoc.id,
      ...tripDoc.data(),
    }))

    return { trips, error: null }
  } catch (error) {
    return {
      trips: [],
      error: toTripServiceError(error, 'Unable to fetch trips right now.'),
    }
  }
}

const tripService = {
  createTrip,
  getTripById,
  getTripsByFamily,
}

export default tripService
