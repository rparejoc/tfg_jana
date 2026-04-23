const OPEN_WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast'
const OPEN_WEATHER_ICON_URL = 'https://openweathermap.org/img/wn'

const getApiKey = () => import.meta.env.VITE_OPENWEATHER_API_KEY

const normalizeWeather = (entry, locationName, date) => {
  const main = entry?.main || {}
  const weather = Array.isArray(entry?.weather) ? entry.weather[0] : null

  return {
    locationName,
    date,
    temperatureAvg:
      typeof main?.temp === 'number'
        ? Number(main.temp.toFixed(1))
        : null,
    condition: weather?.description || weather?.main || 'Unknown',
    icon: weather?.icon ? `${OPEN_WEATHER_ICON_URL}/${weather.icon}@2x.png` : null,
  }
}

const pickForecastForDate = (entries, targetDate) => {
  const dailyEntries = entries.filter((entry) => entry?.dt_txt?.startsWith(targetDate))

  if (dailyEntries.length) {
    return dailyEntries[Math.floor(dailyEntries.length / 2)]
  }

  return entries[0] || null
}

export const getWeather = async (lat, lng, date, locationName = 'Unknown location') => {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !date) {
    return {
      weather: {
        locationName,
        date,
        temperatureAvg: null,
        condition: 'Unknown',
        icon: null,
      },
      error: {
        code: 'weather/invalid-params',
        message: 'Missing weather coordinates or date.',
      },
    }
  }

  const apiKey = getApiKey()

  if (!apiKey) {
    return {
      weather: {
        locationName,
        date,
        temperatureAvg: null,
        condition: 'Unavailable',
        icon: null,
      },
      error: {
        code: 'weather/missing-api-key',
        message: 'Weather API key is not configured.',
      },
    }
  }

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      appid: apiKey,
      units: 'metric',
    })

    const response = await fetch(`${OPEN_WEATHER_BASE_URL}?${params.toString()}`)

    if (!response.ok) {
      throw new Error('Weather request failed.')
    }

    const data = await response.json()
    const list = Array.isArray(data?.list) ? data.list : []
    const chosenEntry = pickForecastForDate(list, date)
    const resolvedLocationName = data?.city?.name || locationName

    if (!chosenEntry) {
      return {
        weather: {
          locationName: resolvedLocationName,
          date,
          temperatureAvg: null,
          condition: 'No forecast available',
          icon: null,
        },
        error: {
          code: 'weather/no-data',
          message: 'No forecast data available for this location/date.',
        },
      }
    }

    return {
      weather: normalizeWeather(chosenEntry, resolvedLocationName, date),
      error: null,
    }
  } catch (error) {
    return {
      weather: {
        locationName,
        date,
        temperatureAvg: null,
        condition: 'Unavailable',
        icon: null,
      },
      error: {
        code: error?.code || 'weather/unknown',
        message: 'Unable to load weather right now.',
        originalError: error,
      },
    }
  }
}

const weatherService = {
  getWeather,
}

export default weatherService
