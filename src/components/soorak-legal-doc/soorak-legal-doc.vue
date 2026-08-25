<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getLegalDocument } from '@/common/apis/legalApi'
import type { LegalDocType } from '@/common/types/legal'

const props = defineProps<{
  docType: LegalDocType
  fallbackTitle: string
  fallbackParagraphs: string[]
}>()

const title = ref(props.fallbackTitle)
const version = ref('')
const html = ref('')
const paragraphs = ref<string[]>(props.fallbackParagraphs)
const loading = ref(true)

onMounted(() => {
  void loadDoc()
})

async function loadDoc() {
  loading.value = true
  try {
    const doc = await getLegalDocument(props.docType)
    if (!doc) return
    title.value = doc.title || props.fallbackTitle
    version.value = doc.version || ''

    const body = String(doc.content_html || '').trim()
    if (body) {
      html.value = body
      paragraphs.value = []
    } else {
      resetFallback()
    }
  } catch (err) {
    console.warn('[soorak-legal-doc] 加载协议文档失败', err)
    resetFallback()
  } finally {
    loading.value = false
  }
}

function resetFallback() {
  title.value = props.fallbackTitle
  version.value = ''
  html.value = ''
  paragraphs.value = props.fallbackParagraphs
}
</script>

<template>
  <scroll-view scroll-y class="legal-scroll">
    <view class="legal page-pad">
      <text v-if="loading" class="legal__p">加载中</text>
      <template v-else>
        <text class="legal__title">元气善筑 · {{ title }}</text>
        <text v-if="version" class="legal__ver">版本 {{ version }}</text>

        <!-- HTML 正文：直接渲染，不再跳转 PDF -->
        <rich-text v-if="html" class="legal__html" :nodes="html" />

        <!-- 本地占位文本兜底 -->
        <template v-else>
          <text v-for="(para, index) in paragraphs" :key="index" class="legal__p">
            {{ para }}
          </text>
        </template>
      </template>
    </view>
  </scroll-view>
</template>

<style lang="scss" scoped>
.legal-scroll {
  height: calc(100vh - 88rpx);
}

.legal {
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
}

.legal__title {
  display: block;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 600;
  color: $mp-ink;
  letter-spacing: 0.08em;
  margin-bottom: 16rpx;
}

.legal__ver {
  display: block;
  font-size: 22rpx;
  letter-spacing: 0.08em;
  color: $mp-text-3;
  margin-bottom: 32rpx;
}

.legal__html {
  display: block;
  font-size: 28rpx;
  line-height: 1.75;
  color: $mp-text-2;
}

.legal__p {
  display: block;
  font-size: 28rpx;
  line-height: 1.75;
  color: $mp-text-2;
  margin-bottom: 28rpx;
  white-space: pre-wrap;
}
</style>
