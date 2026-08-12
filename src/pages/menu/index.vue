<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import ProductCard from './components/product-card.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'

const catalog = useCatalogStore()
const session = useSessionStore()

const drinkCategories = computed(() =>
  catalog.categories.filter((category) => !category.name.includes('零售')),
)

const drinkProducts = computed(() => catalog.products.filter((item) => item.cat !== 'retail'))

const list = computed(() => {
  const active = session.categoryId
  if (active == null) return drinkProducts.value
  const retailCategory = catalog.categories.some(
    (category) => category.id === active && category.name.includes('零售'),
  )
  if (retailCategory) return drinkProducts.value
  return drinkProducts.value.filter((item) => item.categoryId === active)
})

onShow(() => {
  session.hideNativeTabBar()
  void catalog.ensureLoaded().then(() => {
    const active = session.categoryId
    if (active == null) return
    const retailOn = catalog.categories.some(
      (category) => category.id === active && category.name.includes('零售'),
    )
    if (retailOn) session.setCategoryId(null)
  })
})

function setFilter(id: number | null) {
  session.setCategoryId(id)
}
</script>

<template>
  <SoorakChrome title="点单">
    <view v-if="catalog.loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="catalog.errorText" class="mp-empty">
      <text class="t-caption">{{ catalog.errorText }}</text>
      <SoorakButton @click="catalog.ensureLoaded()">重试</SoorakButton>
    </view>
    <view v-else-if="!list.length" class="mp-empty">
      <text class="t-caption">暂无商品</text>
    </view>
    <view v-else class="page-menu">
      <view class="menu-store">
        <text class="menu-store__name">{{ catalog.brand?.store }}</text>
        <text class="menu-store__eta">自取 · 约 8 分钟</text>
      </view>

      <scroll-view scroll-x class="menu-chips" :show-scrollbar="false">
        <view class="menu-chip" :class="{ 'is-on': session.categoryId == null }" @click="setFilter(null)">全部</view>
        <view
          v-for="category in drinkCategories"
          :key="category.id"
          class="menu-chip"
          :class="{ 'is-on': session.categoryId === category.id }"
          @click="setFilter(category.id)"
        >
          {{ category.name }}
        </view>
      </scroll-view>

      <view class="menu-list">
        <ProductCard v-for="item in list" :key="item.id" :product="item" />
      </view>
    </view>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-menu {
  padding: 0 32rpx;
}

.menu-store {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  background: rgba(247, 244, 238, 0.94);
}

.menu-store__name {
  font-size: 26rpx;
  font-weight: 500;
}

.menu-store__eta {
  font-size: 22rpx;
  color: $mp-text-2;
}

.menu-chips {
  white-space: nowrap;
  padding: 8rpx 0 16rpx;
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

.menu-list {
  padding-bottom: 16rpx;
}
</style>
