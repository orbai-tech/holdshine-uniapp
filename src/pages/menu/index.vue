<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import ProductCard from './components/product-card.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import type { FulfillmentMode } from '@/common/types/fulfillment'

const catalog = useCatalogStore()
const session = useSessionStore()

/** 当前门店是否可下单；休息/暂停接单时菜单展示休息提示 */
const canOrder = computed(() => catalog.canOrder)

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

const etaText = computed(() => {
  if (session.fulfillmentMode === 'delivery') {
    const addr = session.deliveryAddress
    if (!addr) return '外卖 · 待填地址'
    return `外卖 · ${addr.tag}`
  }
  if (session.tableName || session.tableCode) {
    return `堂食 · ${session.tableName || session.tableCode}`
  }
  const minutes = 8
  return `堂食 · 约 ${minutes} 分钟`
})

const contextSub = computed(() => {
  if (session.fulfillmentMode === 'delivery') {
    const addr = session.deliveryAddress
    if (!addr) return '请完善收货地址'
    return `${addr.region} ${addr.door}`
  }
  const store = catalog.brand?.store || '选择门店'
  if (session.tableName || session.tableCode) {
    return `${store} · ${session.tableName || session.tableCode}`
  }
  return store
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

/** 分类 id 是 18 位雪花大整数（string），直接透传 */
function setFilter(id: string | null) {
  session.setCategoryId(id)
}

function onModeTap(mode: FulfillmentMode) {
  if (mode === 'dine_in') {
    if (session.fulfillmentMode === 'dine_in') {
      session.openStorePicker('dine_in')
      return
    }
    session.startDineIn()
    return
  }
  if (session.fulfillmentMode === 'delivery' && session.deliveryAddress) {
    session.openStorePicker('delivery')
    return
  }
  session.startDelivery()
}

function onContextTap() {
  if (session.fulfillmentMode === 'delivery') {
    session.openAddressBook()
    return
  }
  session.openStorePicker(session.fulfillmentMode)
}
</script>

<template>
  <SoorakChrome title="点单" show-back>
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
      <view class="menu-fulfill">
        <view
          class="menu-fulfill__item"
          :class="{ 'is-on': session.fulfillmentMode === 'dine_in' }"
          @click="onModeTap('dine_in')"
        >
          到店堂食
        </view>
        <view
          class="menu-fulfill__item"
          :class="{ 'is-on': session.fulfillmentMode === 'delivery' }"
          @click="onModeTap('delivery')"
        >
          外卖配送
        </view>
      </view>

      <view class="menu-store" @click="onContextTap">
        <view class="menu-store__left">
          <text class="menu-store__name">{{ contextSub }}</text>
          <view class="menu-store__switch">
            {{ session.fulfillmentMode === 'delivery' ? '改地址' : '切换' }}
          </view>
        </view>
        <text class="menu-store__eta">{{ etaText }}</text>
      </view>

      <view v-if="!canOrder" class="menu-resting">
        <text class="menu-resting__text">门店休息中，暂不可点单</text>
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

.menu-fulfill {
  display: flex;
  gap: 12rpx;
  padding-top: 8rpx;
}

.menu-fulfill__item {
  flex: 1;
  min-height: 72rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  background: $mp-cloud;
}

.menu-fulfill__item.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
  font-weight: 500;
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

.menu-store__left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-width: 0;
  flex: 1;
}

.menu-store__name {
  font-size: 26rpx;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-store__switch {
  font-size: 24rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
  flex-shrink: 0;
}

.menu-store__eta {
  font-size: 22rpx;
  color: $mp-text-2;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.menu-resting {
  margin: 4rpx 0 12rpx;
  padding: 16rpx 24rpx;
  border-radius: 12rpx;
  background: $mp-cloud;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.menu-resting__text {
  font-size: 24rpx;
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
