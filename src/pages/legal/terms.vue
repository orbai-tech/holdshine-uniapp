<script setup lang="ts">
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakLegalDoc from '@/components/soorak-legal-doc/soorak-legal-doc.vue'
import { LEGAL_DOC_TYPE } from '@/common/types/legal'
import { TERMS_PARAGRAPHS, TERMS_TITLE } from '@/common/legal/terms'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
})
</script>

<template>
  <SoorakChrome :title="TERMS_TITLE" show-back>
    <SoorakLegalDoc
      :doc-type="LEGAL_DOC_TYPE.USER"
      :fallback-title="TERMS_TITLE"
      :fallback-paragraphs="TERMS_PARAGRAPHS"
    />
  </SoorakChrome>
</template>
