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
  html: '<span class="trip-marker-pin" aria-hidden="true"></span>',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -38],
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
  <section>
    <h2>Map preview</h2>
    <div ref="mapElement" class="trip-map" />
  </section>
</template>

<style scoped>
.trip-map {
  height: 350px;
  width: 100%;
  border-radius: 8px;
}
.trip-map :deep(.trip-marker-icon) {
  background: transparent;
  border: 0;
}

.trip-map :deep(.trip-marker-pin) {
  position: relative;
  display: block;
  width: 30px;
  height: 30px;
  background: #dc2626;
  border: 3px solid #ffffff;
  border-radius: 50% 50% 50% 0;
  box-shadow: 0 4px 10px rgb(0 0 0 / 30%);
  transform: rotate(-45deg);
}

.trip-map :deep(.trip-marker-pin::after) {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10px;
  height: 10px;
  content: '';
  background: #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
</style>
