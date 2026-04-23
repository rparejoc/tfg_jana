import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'

const toPhotoServiceError = (error, fallbackMessage) => ({
  code: error?.code || 'storage/unknown',
  message: fallbackMessage,
  originalError: error,
})

const getRequiredUploadData = (file, user, tripId, familyId) => {
  if (!(file instanceof File)) {
    throw new Error('A valid photo file is required.')
  }

  if (!user?.uid) {
    throw new Error('A valid authenticated user is required.')
  }

  if (!tripId) {
    throw new Error('A valid tripId is required.')
  }

  if (!familyId) {
    throw new Error('A valid familyId is required.')
  }
}

export const uploadPhoto = async (file, user, tripId, familyId) => {
  try {
    getRequiredUploadData(file, user, tripId, familyId)

    const photoId = crypto.randomUUID()
    const storagePath = `families/${familyId}/trips/${tripId}/${photoId}.jpg`
    const photoRef = ref(storage, storagePath)

    await uploadBytes(photoRef, file, {
      contentType: file.type || 'image/jpeg',
    })

    const url = await getDownloadURL(photoRef)

    return {
      url,
      storagePath,
      error: null,
    }
  } catch (error) {
    return {
      url: null,
      storagePath: null,
      error: toPhotoServiceError(error, 'Unable to upload photo right now.'),
    }
  }
}

const photoService = {
  uploadPhoto,
}

export default photoService
