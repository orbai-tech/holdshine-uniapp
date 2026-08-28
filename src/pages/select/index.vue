<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import MallProductCard from '@/pages/select/components/mall-product-card.vue'
import { getMallCatalog } from '@/common/apis/mallApi'
import type { MallCatalogRes, MallProductCardRes } from '@/common/types/mall'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'

const catalog = useCatalogStore()
const session = useSessionStore()

const loading = ref(false)
const errorText = ref('')
const mall = ref<MallCatalogRes | null>(null)
const chip = ref<string>('all')

const categories = computed(() => mall.value?.categories ?? [])

const list = computed<MallProductCardRes[]>(() => {
  const cats = categories.value
  if (!cats.length) return []
  if (chip.value === 'all') {
    return cats.flatMap((cat) => cat.products ?? [])
  }
  const matched = cats.find((cat) => cat.category_id === chip.value)
  return matched?.products ?? []
})

const slogan = computed(
  () => mall.value?.slogan?.trim() || '把门店的仪式，带回家',
)

async function loadCatalog() {
  loading.value = true
  errorText.value = ''
  try {
    await catalog.ensureLoaded()
    const storeId = catalog.currentStoreId
    if (storeId == null) {
      mall.value = null
      errorText.value = '请先选择门店'
      return
    }
    mall.value = await getMallCatalog(storeId)
    if (
      chip.value !== 'all' &&
      !(mall.value.categories ?? []).some((cat) => cat.category_id === chip.value)
    ) {
      chip.value = 'all'
    }
  } catch (error) {
    mall.value = null
    errorText.value = toErrorMessage(error, '加载失败')
  } finally {
    loading.value = false
  }
}

function setChip(next: string) {
  chip.value = next
}

/** 礼品详情已是独立页：卡片点击直接跳转 */
function openDetailPage(productId: string) {
  session.openMallProductPage(productId)
}

onShow(() => {
  session.hideNativeTabBar()
  void session.refreshMemberRates()
  void loadCatalog()
})
</script>

<template>
  <SoorakChrome title="选物">
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="errorText" class="mp-empty">
      <text class="t-caption">{{ errorText }}</text>
      <SoorakButton @click="loadCatalog">重试</SoorakButton>
    </view>
    <view v-else class="page-select page-pad">
      <view class="select-head">
        <text class="t-section">节礼与风物</text>
        <text class="t-caption">{{ slogan }}</text>
      </view>

      <scroll-view scroll-x class="menu-chips" :show-scrollbar="false">
        <view class="menu-chip" :class="{ 'is-on': chip === 'all' }" @click="setChip('all')">
          全部
        </view>
        <view
          v-for="cat in categories"
          :key="cat.category_id"
          class="menu-chip"
          :class="{ 'is-on': chip === cat.category_id }"
          @click="setChip(cat.category_id)"
        >
          {{ cat.category_name }}
        </view>
      </scroll-view>

      <view v-if="!list.length" class="mp-empty">
        <text class="t-caption">今日风物暂未上架，明日再遇。</text>
      </view>
      <view v-else class="select-list">
        <MallProductCard
          v-for="item in list"
          :key="item.product_id"
          :product="item"
          @open="openDetailPage"
        />
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.select-head {
  margin-bottom: 8rpx;
}

.select-head .t-caption {
  display: block;
  margin-top: 8rpx;
}

.menu-chips {
  white-space: nowrap;
  padding: 16rpx 0 8rpx;
  width: 100%;
}

.menu-chip {
  display: inline-flex;
  align-items: center;
  min-height: 64rpx;
  padding: 0 24rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.menu-chip.is-on {
  background: $mp-ink;
  color: $mp-paper;
  box-shadow: none;
}

.select-list {
  padding-bottom: 16rpx;
}
</style>
