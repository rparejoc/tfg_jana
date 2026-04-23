const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search'

const mapLocationResult = (result) => {
  const displayName = result?.display_name || ''
  const [primaryName] = displayName.split(',')

  return {
    name: result?.name || primaryName || 'Unknown location',
    country: result?.address?.country || 'Unknown country',
    lat: Number(result?.lat),
    lng: Number(result?.lon),
  }
}

export const searchLocation = async (query) => {
  const trimmedQuery = query?.trim()

  if (!trimmedQuery) {
    return { locations: [], error: null }
  }

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      q: trimmedQuery,
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Geocoding request failed.')
    }

    const results = await response.json()
    const locations = Array.isArray(results) ? results.map(mapLocationResult) : []

    return { locations, error: null }
  } catch (error) {
    return {
      locations: [],
      error: {
        code: error?.code || 'geocoding/unknown',
        message: 'Unable to search locations right now.',
        originalError: error,
      },
    }
  }
}

const geocodingService = {
  searchLocation,
}

export default geocodingService
