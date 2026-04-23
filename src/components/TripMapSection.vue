<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const props = defineProps({
  locations: {
    type: Array,
    default: () => [],
  },
})

let map = null
let markersLayer = null
const mapElement = ref(null)

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
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

    L.marker([location.lat, location.lng])
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
</style>
