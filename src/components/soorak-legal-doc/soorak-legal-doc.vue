<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getLegalDocument } from '@/common/apis/legalApi'
import { baseURL } from '@/plugins/request'
import { readStoredToken } from '@/utils/authStorage'
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
const pdfUrl = ref('')
const pdfOpening = ref(false)
const loading = ref(true)

onMounted(() => {
  void loadDoc()
})

function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const base = String(baseURL).replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

async function loadDoc() {
  loading.value = true
  try {
    const doc = await getLegalDocument(props.docType)
    if (!doc) return
    title.value = doc.title || props.fallbackTitle
    version.value = doc.version || ''

    // 后端提供了 PDF（兼容多种下发字段）：下载后直接打开系统 PDF 预览
    const rawPdf = doc.pdf_url ?? doc.pdf_path ?? doc.file_url ?? doc.content_pdf ?? null
    console.log('[soorak-legal-doc] 文档字段:', {
      doc_type: doc.doc_type,
      version: doc.version,
      title: doc.title,
      pdf_url: doc.pdf_url,
      pdf_path: doc.pdf_path,
      file_url: doc.file_url,
      content_pdf: doc.content_pdf,
    })
    const url = resolveAssetUrl(rawPdf)
    pdfUrl.value = url
    const body = String(doc.content_html || '').trim()
    if (body) {
      html.value = body
      paragraphs.value = []
    }
    if (url) {
      void openPdf(url)
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
  pdfUrl.value = ''
  paragraphs.value = props.fallbackParagraphs
}

function openPdf(url: string = pdfUrl.value) {
  if (!url || pdfOpening.value) return
  pdfOpening.value = true
  console.log('[soorak-legal-doc] 打开 PDF:', url)
  // #ifdef MP-WEIXIN
  const token = readStoredToken()
  uni.downloadFile({
    url,
    header: token ? { Authorization: `Bearer ${token}` } : {},
    success: (res) => {
      if (res.statusCode === 200) {
        // showMenu 默认 false（不弹分享菜单），各基础库版本均安全，无需按版本判断
        uni.openDocument({
          filePath: res.tempFilePath,
          fileType: 'pdf',
          success: () => {
            pdfOpening.value = false
          },
          fail: (openErr) => {
            pdfOpening.value = false
            console.warn('[soorak-legal-doc] openDocument 失败', openErr)
            uni.showToast({ title: 'PDF 打开失败', icon: 'none' })
          },
        })
      } else {
        pdfOpening.value = false
        console.warn('[soorak-legal-doc] 下载 PDF 非 200:', res.statusCode, res.errMsg || '')
        uni.showToast({ title: `PDF 下载失败(${res.statusCode})`, icon: 'none' })
      }
    },
    fail: (err) => {
      pdfOpening.value = false
      console.warn('[soorak-legal-doc] 下载 PDF 失败', err)
      // 微信小程序最常见原因是下载域名未加入 downloadFile 合法域名白名单
      uni.showToast({ title: 'PDF 下载失败，请检查域名白名单', icon: 'none' })
    },
  })
  // #endif
  // #ifndef MP-WEIXIN
  window.open(url, '_blank')
  pdfOpening.value = false
  // #endif
}
</script>

<template>
  <scroll-view scroll-y class="legal-scroll">
    <view class="legal page-pad">
      <text v-if="loading" class="legal__p">加载中</text>
      <template v-else>
        <text class="legal__title">元气善筑 · {{ title }}</text>
        <text v-if="version" class="legal__ver">版本 {{ version }}</text>

        <!-- PDF：提供重新打开入口（进入时已自动打开） -->
        <view v-if="pdfUrl" class="legal__pdf-card" @click="openPdf()">
          <text class="legal__pdf-title">{{ title }}</text>
          <text class="legal__pdf-hint">{{ pdfOpening ? '正在打开 PDF…' : '如未自动打开，请点击此处查看 PDF' }}</text>
        </view>

        <!-- HTML 兜底：后端未上传 PDF 时展示富文本正文 -->
        <rich-text v-else-if="html" class="legal__html" :nodes="html" />

        <!-- 本地占位文本 -->
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

.legal__pdf-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx 32rpx;
  margin: 48rpx 0;
  border-radius: 16rpx;
  background-color: $mp-cloud;
}

.legal__pdf-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $mp-ink;
  margin-bottom: 12rpx;
}

.legal__pdf-hint {
  font-size: 26rpx;
  color: $mp-text-3;
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
