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

const encodeStoragePath = (path = '') =>
  path
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

const buildStorageUrl = (path = '') => {
  const { url, bucket } = getStorageConfig()
  const encodedBucket = encodeURIComponent(bucket)
  const normalizedPath = encodeStoragePath(path)

  return `${url}/storage/v1/object/${encodedBucket}${normalizedPath ? `/${normalizedPath}` : ''}`
}

const buildPublicUrl = (path) => {
  const { url, bucket } = getStorageConfig()
  const encodedBucket = encodeURIComponent(bucket)
  const normalizedPath = encodeStoragePath(path)

  return `${url}/storage/v1/object/public/${encodedBucket}/${normalizedPath}`
}

const getStorageHeaders = (extraHeaders = {}) => {
  const { anonKey } = getStorageConfig()

  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: 'application/json',
    ...extraHeaders,
  }
}

const parseStorageError = async (response) => {
  const responseText = await response.text().catch(() => '')

  if (!responseText) {
    return new SupabaseStorageError(
      `Supabase Storage request failed with status ${response.status}.`,
      { status: response.status },
    )
  }

  try {
    const responseBody = JSON.parse(responseText)
    const message =
      responseBody?.message ||
      responseBody?.error_description ||
      responseBody?.error ||
      responseText

    return new SupabaseStorageError(message, {
      status: response.status,
      code: responseBody?.code || responseBody?.error || null,
      details: responseBody?.details || responseBody?.hint || null,
      responseBody,
    })
  } catch {
    return new SupabaseStorageError(responseText, {
      status: response.status,
      responseBody: responseText,
    })
  }
}

export const uploadObject = async (path, file, options = {}) => {
  const response = await fetch(buildStorageUrl(path), {
    method: 'POST',
    headers: getStorageHeaders({
      'Content-Type': options.contentType || file.type || 'application/octet-stream',
      'cache-control': options.cacheControl || '3600',
      'x-upsert': options.upsert ? 'true' : 'false',
    }),
    body: file,
  })

  if (!response.ok) {
    throw await parseStorageError(response)
  }

  return response.json().catch(() => null)
}

export const removeObjects = async (paths) => {
  const validPaths = paths.filter((path) => typeof path === 'string' && path.trim())

  if (!validPaths.length) {
    return null
  }

  const response = await fetch(buildStorageUrl(), {
    method: 'DELETE',
    headers: getStorageHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ prefixes: validPaths }),
  })

  if (!response.ok) {
    throw await parseStorageError(response)
  }

  return response.json().catch(() => null)
}

export const getPublicObjectUrl = (path) => buildPublicUrl(path)

export { photosBucket, SupabaseStorageError }
