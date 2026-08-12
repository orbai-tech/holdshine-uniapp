<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import ProductCard from '@/pages/menu/components/product-card.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import type { RitualId } from '@/common/types/catalog'

type RetailChip = 'all' | 'gift' | 'nourish'

const catalog = useCatalogStore()
const chip = ref<RetailChip>('all')

const retailProducts = computed(() => catalog.products.filter((item) => item.cat === 'retail'))

const list = computed(() => {
  if (chip.value === 'all') return retailProducts.value
  return retailProducts.value.filter((item) => item.ritual === chip.value)
})

onShow(() => {
  useSessionStore().hideNativeTabBar()
  void catalog.ensureLoaded()
})

function setChip(next: RetailChip) {
  chip.value = next
}

function ritualOf(id: RitualId) {
  return catalog.rituals.find((item) => item.id === id)?.title ?? id
}
</script>

<template>
  <SoorakChrome title="选物">
    <view v-if="catalog.loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="catalog.errorText" class="mp-empty">
      <text class="t-caption">{{ catalog.errorText }}</text>
      <SoorakButton @click="catalog.ensureLoaded()">重试</SoorakButton>
    </view>
    <view v-else class="page-select page-pad">
      <view class="select-head">
        <text class="t-section">节礼与风物</text>
        <text class="t-caption">把门店的仪式，带回家</text>
      </view>

      <scroll-view scroll-x class="menu-chips" :show-scrollbar="false">
        <view class="menu-chip" :class="{ 'is-on': chip === 'all' }" @click="setChip('all')">全部</view>
        <view class="menu-chip" :class="{ 'is-on': chip === 'gift' }" @click="setChip('gift')">
          {{ ritualOf('gift') }}
        </view>
        <view class="menu-chip" :class="{ 'is-on': chip === 'nourish' }" @click="setChip('nourish')">
          {{ ritualOf('nourish') }}
        </view>
      </scroll-view>

      <view v-if="!list.length" class="mp-empty">
        <text class="t-caption">今日风物暂未上架，明日再遇。</text>
      </view>
      <view v-else class="select-list">
        <ProductCard v-for="item in list" :key="item.id" :product="item" />
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
