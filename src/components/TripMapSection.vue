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

  if (!props.locations.length) {
    setDefaultWorldView()
    return
  }

  props.locations.forEach((location) => {
    const hasCoordinates = Number.isFinite(location.lat) && Number.isFinite(location.lng)

    if (!hasCoordinates) {
      return
    }

    L.marker([location.lat, location.lng], { icon: tripMarkerIcon })
      .addTo(markersLayer)
      .bindPopup(location.name || 'Selected location')
  })

  const firstLocation = props.locations[0]

  if (Number.isFinite(firstLocation?.lat) && Number.isFinite(firstLocation?.lng)) {
    map.setView([firstLocation.lat, firstLocation.lng], 8)
  } else {
    setDefaultWorldView()
  }
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
