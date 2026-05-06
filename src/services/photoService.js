import { getPublicObjectUrl, uploadObject } from '../supabaseStorage'

const imageTypeByExtension = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

const extensionByImageType = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const toPhotoServiceError = (error, fallbackMessage) => ({
  code: error?.code || 'storage/unknown',
  status: error?.status || null,
  message: error?.message || fallbackMessage,
  details: error?.details || null,
  originalError: error,
})

const getRequiredUploadData = (file, user, tripId, familyId) => {
  if (!(file instanceof File)) {
    throw new Error('A valid photo file is required.')
  }

  if (!file.size) {
    throw new Error('The selected photo is empty.')
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

const getExtensionFromName = (file) => {
  const extensionFromName = file.name?.split('.').pop()?.toLowerCase()

  if (extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)) {
    return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName
  }

  return null
}

const getSafeImageMetadata = (file) => {
  const type = file.type?.toLowerCase()
  const extensionFromName = getExtensionFromName(file)
  const contentType =
    extensionByImageType[type] && type !== 'image/jpg'
      ? type
      : imageTypeByExtension[extensionFromName] || 'image/jpeg'
  const extension = extensionByImageType[contentType] || extensionFromName || 'jpg'

  return { contentType, extension }
}

export const uploadPhoto = async (file, user, tripId, familyId) => {
  try {
    getRequiredUploadData(file, user, tripId, familyId)

    const photoId = crypto.randomUUID()
    const { contentType, extension } = getSafeImageMetadata(file)
    const storagePath = `families/${familyId}/trips/${tripId}/${photoId}.${extension}`

    await uploadObject(storagePath, file, {
      contentType,
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
