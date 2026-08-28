<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FALLBACK_IMAGE, fetchImageAsBase64 } from '@/utils/mediaUrl'

const props = defineProps<{
  src: string
  mode?: string
}>()

const currentSrc = ref(props.src || FALLBACK_IMAGE)
/** 该地址是否已尝试过 base64 降级，避免失败后无限重试 */
const degraded = ref(false)

watch(
  () => props.src,
  (next) => {
    currentSrc.value = next || FALLBACK_IMAGE
    degraded.value = false
  },
)

/** 仅网络图片需要降级通道；本地 static / 已是 base64 的失败直接走兜底 */
const isRemote = computed(() => /^https?:\/\//i.test(currentSrc.value))

async function onError() {
  if (currentSrc.value === FALLBACK_IMAGE) return
  // 真机调试常见：image 通道加载 HTTP 局域网图被微信拦截（模拟器正常、真机裂图），
  // 降级为 wx.request 拉取二进制转 base64 显示。
  if (isRemote.value && !degraded.value) {
    degraded.value = true
    try {
      const dataUrl = await fetchImageAsBase64(currentSrc.value)
      currentSrc.value = dataUrl
      return
    } catch (error) {
      console.warn('[soorak-image] 图片降级拉取失败:', currentSrc.value, error)
    }
  }
  currentSrc.value = FALLBACK_IMAGE
}
</script>

<template>
  <image :src="currentSrc" :mode="mode || 'aspectFill'" @error="onError" />
</template>
