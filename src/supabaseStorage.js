import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const photosBucket = import.meta.env.VITE_SUPABASE_PHOTOS_BUCKET || 'trip-photos'

class SupabaseStorageError extends Error {
  constructor(message, { status = null, code = null, details = null, responseBody = null } = {}) {
    super(message)
    this.name = 'SupabaseStorageError'
    this.status = status
    this.code = code
    this.details = details
    this.responseBody = responseBody
  }
}

const getStorageConfig = () => {
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is required to upload photos.')
  }

  if (!supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY is required to upload photos.')
  }

  if (!photosBucket) {
    throw new Error('VITE_SUPABASE_PHOTOS_BUCKET is required to upload photos.')
  }

  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    bucket: photosBucket,
  }
}

let supabaseClient = null

const getSupabaseClient = () => {
  const { url, anonKey } = getStorageConfig()

  if (!supabaseClient) {
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  return supabaseClient
}

const toStorageError = (error, fallbackMessage) => {
  if (!error) {
    return new SupabaseStorageError(fallbackMessage)
  }

  return new SupabaseStorageError(error.message || fallbackMessage, {
    status: error.statusCode || error.status || null,
    code: error.error || error.code || null,
    details: error.details || error.hint || null,
    responseBody: error,
  })
}

const getStorageBucket = () => {
  const { bucket } = getStorageConfig()

  return getSupabaseClient().storage.from(bucket)
}

export const uploadObject = async (path, file, options = {}) => {
  const { data, error } = await getStorageBucket().upload(path, file, {
    cacheControl: options.cacheControl || '3600',
    contentType: options.contentType || file.type || 'application/octet-stream',
    upsert: Boolean(options.upsert),
  })

  if (error) {
    throw toStorageError(error, 'Unable to upload the photo to Supabase Storage.')
  }

  return data
}

export const removeObjects = async (paths) => {
  const validPaths = paths.filter((path) => typeof path === 'string' && path.trim())

  if (!validPaths.length) {
    return null
  }

  const { data, error } = await getStorageBucket().remove(validPaths)

  if (error) {
    throw toStorageError(error, 'Unable to delete photos from Supabase Storage.')
  }

  return data
}

export const getPublicObjectUrl = (path) => {
  const { data } = getStorageBucket().getPublicUrl(path)

  return data.publicUrl
}

export { photosBucket, SupabaseStorageError }
