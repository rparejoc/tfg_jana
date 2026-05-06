import { getPublicObjectUrl, uploadObject } from '../supabaseStorage'

const toPhotoServiceError = (error, fallbackMessage) => ({
  code: error?.code || 'storage/unknown',
  message: error?.message || fallbackMessage,
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

const getSafeFileExtension = (file) => {
  const extensionFromName = file.name?.split('.').pop()?.toLowerCase()

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName
  }

  return file.type?.split('/').pop()?.toLowerCase() || 'jpg'
}

export const uploadPhoto = async (file, user, tripId, familyId) => {
  try {
    getRequiredUploadData(file, user, tripId, familyId)

    const photoId = crypto.randomUUID()
    const extension = getSafeFileExtension(file)
    const storagePath = `families/${familyId}/trips/${tripId}/${photoId}.${extension}`

    await uploadObject(storagePath, file, {
      contentType: file.type || 'image/jpeg',
    })

    return {
      photoId,
      url: getPublicObjectUrl(storagePath),
      storagePath,
      error: null,
    }
  } catch (error) {
    return {
      photoId: null,
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
