<script setup>
import { onBeforeUnmount, ref } from 'vue'

defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:selectedFiles'])

const selectedFiles = ref([])
const previews = ref([])

const clearPreviewUrls = () => {
  previews.value.forEach((preview) => {
    URL.revokeObjectURL(preview.previewUrl)
  })
}

const emitSelectedFiles = () => {
  emit('update:selectedFiles', selectedFiles.value)
}

const handleFileChange = (event) => {
  const files = Array.from(event.target.files || [])

  if (!files.length) {
    return
  }

  const imageFiles = files.filter((file) => file.type.startsWith('image/'))

  imageFiles.forEach((file) => {
    selectedFiles.value.push(file)
    previews.value.push({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    })
  })

  emitSelectedFiles()
  event.target.value = ''
}

const removeFile = (index) => {
  const preview = previews.value[index]

  if (preview?.previewUrl) {
    URL.revokeObjectURL(preview.previewUrl)
  }

  selectedFiles.value.splice(index, 1)
  previews.value.splice(index, 1)
  emitSelectedFiles()
}

onBeforeUnmount(() => {
  clearPreviewUrls()
})
</script>

<template>
  <section>
    <label for="trip-photos">Trip photos</label>
    <input
      id="trip-photos"
      type="file"
      accept="image/*"
      multiple
      :disabled="disabled"
      @change="handleFileChange"
    />

    <ul v-if="previews.length">
      <li v-for="(preview, index) in previews" :key="preview.id">
        <img :src="preview.previewUrl" :alt="preview.name" width="120" />
        <p>{{ preview.name }}</p>
        <button type="button" :disabled="disabled" @click="removeFile(index)">
          Remove
        </button>
      </li>
    </ul>
  </section>
</template>
