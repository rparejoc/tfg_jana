<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  locations: {
    type: Array,
    default: () => [],
  },
})

let map = null
let markersLayer = null
const mapElement = ref(null)

const tripMarkerIcon = L.divIcon({
  className: 'trip-marker-icon',
  html: '<span class="trip-marker-ring" aria-hidden="true"><span class="trip-marker-dot"></span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
})

const isValidLocation = (location) =>
  Number.isFinite(location?.lat) && Number.isFinite(location?.lng)

const getValidLocations = () => props.locations.filter(isValidLocation)

const getCurvedRoutePoints = (start, end) => {
  const latDifference = end.lat - start.lat
  const lngDifference = end.lng - start.lng
  const distance = Math.sqrt(latDifference ** 2 + lngDifference ** 2)
  const curveStrength = Math.min(distance * 0.22, 8)
  const perpendicularLat = distance ? (-lngDifference / distance) * curveStrength : 0
  const perpendicularLng = distance ? (latDifference / distance) * curveStrength : 0

  return Array.from({ length: 32 }, (_, index) => {
    const progress = index / 31
    const curveOffset = Math.sin(Math.PI * progress)

    return [
      start.lat + latDifference * progress + perpendicularLat * curveOffset,
      start.lng + lngDifference * progress + perpendicularLng * curveOffset,
    ]
  })
}

const drawRoute = (validLocations) => {
  if (validLocations.length < 2) {
    return []
  }

  const routeBounds = []

  for (let index = 0; index < validLocations.length - 1; index += 1) {
    const routePoints = getCurvedRoutePoints(validLocations[index], validLocations[index + 1])
    routeBounds.push(...routePoints)

    L.polyline(routePoints, {
      color: '#ffffff',
      weight: 8,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(markersLayer)

    L.polyline(routePoints, {
      color: '#2563eb',
      weight: 4,
      opacity: 0.85,
      dashArray: '10 12',
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false,
    }).addTo(markersLayer)
  }

  return routeBounds
}

const setDefaultWorldView = () => {
  if (!map) {
    return
  }

  map.setView([20, 0], 2)
}

const drawMarkers = () => {
  if (!map || !markersLayer) {
    return
  }

  markersLayer.clearLayers()

  const validLocations = getValidLocations()

  if (!validLocations.length) {
    setDefaultWorldView()
    return
  }

  const routeBounds = drawRoute(validLocations)

  validLocations.forEach((location) => {
    L.marker([location.lat, location.lng], { icon: tripMarkerIcon })
      .addTo(markersLayer)
      .bindPopup(location.name || 'Selected location')
  })

  if (validLocations.length > 1) {
    map.fitBounds(routeBounds, {
      padding: [45, 45],
      maxZoom: 8,
    })
    return
  }

  map.setView([validLocations[0].lat, validLocations[0].lng], 8)
}

onMounted(() => {
  if (!mapElement.value) {
    return
  }

  map = L.map(mapElement.value)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  markersLayer = L.layerGroup().addTo(map)

  drawMarkers()
})

watch(
  () => props.locations,
  () => {
    drawMarkers()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div ref="mapElement" class="trip-map" />
</template>

<style scoped>
.trip-map {
  height: 350px;
  width: 100%;
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(circle at 20% 18%, rgb(37 99 235 / 10%), transparent 22rem),
    linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #ecfdf5 100%);
}

.trip-map :deep(.leaflet-container) {
  font-family: inherit;
}

.trip-map :deep(.leaflet-tile-pane) {
  opacity: 0.32;
  filter: saturate(0.75) contrast(0.96);
}

.trip-map :deep(.leaflet-control-attribution) {
  border-top-left-radius: 10px;
  font-size: 10px;
}

.trip-map :deep(.trip-marker-icon) {
  background: transparent;
  border: 0;
}

.trip-map :deep(.trip-marker-ring) {
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border: 6px solid rgb(37 99 235 / 20%);
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 10px 22px rgb(37 99 235 / 26%);
}

.trip-map :deep(.trip-marker-dot) {
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #2563eb;
}
</style>
