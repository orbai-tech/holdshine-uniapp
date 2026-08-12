<script setup lang="ts">
import { computed, watch } from 'vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { lineAmount, useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const cart = useCartStore()
const catalog = useCatalogStore()

const usingRemote = computed(() => Boolean(cart.remote))
const empty = computed(() => (usingRemote.value ? cart.remoteItems.length === 0 : cart.items.length === 0))

watch(
  () => session.cartOpen,
  (open) => {
    if (open && catalog.currentStoreId != null) {
      void cart.refreshCart()
    }
  },
)

function goMenu() {
  session.goTab('/pages/menu/index')
}

function itemImage(productId: number) {
  return catalog.findProduct(String(productId))?.img || '/static/images/products/latte.jpg'
}
</script>

<template>
  <SoorakSheet :open="session.cartOpen" title="购物袋" @close="session.setCartOpen(false)">
    <view v-if="empty" class="mp-empty">
      <text class="mp-empty__title">购物袋是空的</text>
      <text class="t-caption">去点一杯此刻需要的饮品</text>
      <SoorakButton @click="goMenu">去点单</SoorakButton>
    </view>
    <view v-else-if="usingRemote" class="cart-list">
      <view v-for="item in cart.remoteItems" :key="item.item_id" class="cart-row">
        <image :src="itemImage(item.product_id)" mode="aspectFill" class="cart-row__img" />
        <view>
          <text class="cart-row__name">{{ item.product_name }}</text>
          <text class="cart-row__meta">{{ item.sku_name || '标准装' }}</text>
          <view class="cart-row__price">
            <text>¥{{ cart.itemLineAmount(item) }}</text>
            <text class="cart-row__qty">×{{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>
    <view v-else class="cart-list">
      <view v-for="(item, idx) in cart.items" :key="`${item.product.id}-${idx}`" class="cart-row">
        <image :src="item.product.img" mode="aspectFill" class="cart-row__img" />
        <view>
          <text class="cart-row__name">{{ item.product.name }}</text>
          <text class="cart-row__meta">
            {{ item.product.cat !== 'retail' ? `${item.size} / ${item.temp}` : '标准装' }}{{ item.extras.length ? ` · 加料 ${item.extras.length}` : '' }}
          </text>
          <view class="cart-row__price">
            <text>¥{{ lineAmount(item) }}</text>
            <text class="cart-row__qty">×{{ item.qty }}</text>
          </view>
        </view>
      </view>
    </view>

    <template v-if="!empty" #footer>
      <view>
        <text class="t-caption">合计</text>
        <text class="ps-price">¥{{ cart.cartTotal }}</text>
      </view>
      <SoorakButton @click="cart.placeOrder()">确认下单</SoorakButton>
    </template>
  </SoorakSheet>
</template>

<style lang="scss" scoped>
.cart-list {
  padding: 16rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.cart-row {
  display: flex;
  gap: 24rpx;
}

.cart-row__img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background: $mp-stone;
}

.cart-row__name {
  display: block;
  margin-bottom: 8rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.cart-row__meta {
  display: block;
  font-size: 24rpx;
  color: $mp-text-2;
}

.cart-row__price {
  display: flex;
  gap: 12rpx;
  align-items: baseline;
  margin-top: 12rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 32rpx;
}

.cart-row__qty {
  font-family: "PingFang SC", "Noto Sans SC", sans-serif;
  font-size: 22rpx;
  color: $mp-text-3;
}

.ps-price {
  display: block;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 44rpx;
  font-weight: 500;
}
</style>
