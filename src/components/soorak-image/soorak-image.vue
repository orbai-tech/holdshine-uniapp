<script setup lang="ts">
import { ref, watch } from 'vue'
import { FALLBACK_IMAGE } from '@/utils/mediaUrl'

const props = defineProps<{
  src: string
  mode?: string
}>()

const currentSrc = ref(props.src || FALLBACK_IMAGE)

watch(
  () => props.src,
  (next) => {
    currentSrc.value = next || FALLBACK_IMAGE
  },
)

function onError() {
  if (currentSrc.value !== FALLBACK_IMAGE) {
    currentSrc.value = FALLBACK_IMAGE
  }
}
</script>

<template>
  <image :src="currentSrc" :mode="mode || 'aspectFill'" @error="onError" />
</template>
