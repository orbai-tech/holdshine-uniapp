<script lang="ts">
export default {
  options: {
    virtualHost: true,
    styleIsolation: 'shared',
  },
}
</script>

<script setup lang="ts">
import { computed, watch } from 'vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { lineAmount, useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { formatItemSpec } from '@/utils/orderItemLabel'

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

function goCheckout() {
  session.setCartOpen(false)
  uni.navigateTo({
    url: '/pages/checkout/index',
    fail() {},
  })
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
        <view class="cart-row__body">
          <text class="cart-row__name">{{ item.product_name }}</text>
          <text class="cart-row__meta">{{ formatItemSpec(item) || '标准装' }}</text>
          <view class="cart-row__price">
            <text>¥{{ cart.itemLineAmount(item) }}</text>
          </view>
        </view>
        <view class="cart-qty">
          <view class="cart-qty__btn" @click="cart.changeRemoteQty(item.item_id, -1)">−</view>
          <text class="cart-qty__num">{{ item.quantity }}</text>
          <view class="cart-qty__btn" @click="cart.changeRemoteQty(item.item_id, 1)">+</view>
        </view>
      </view>
    </view>
    <view v-else class="cart-list">
      <view v-for="(item, idx) in cart.items" :key="`${item.product.id}-${idx}`" class="cart-row">
        <image :src="item.product.img" mode="aspectFill" class="cart-row__img" />
        <view class="cart-row__body">
          <text class="cart-row__name">{{ item.product.name }}</text>
          <text class="cart-row__meta">
            {{ item.product.cat !== 'retail' ? `${item.size} / ${item.temp}` : '标准装' }}{{ item.extras.length ? ` · ${item.extras.join(' · ')}` : '' }}
          </text>
          <view class="cart-row__price">
            <text>¥{{ lineAmount(item) }}</text>
          </view>
        </view>
        <view class="cart-qty">
          <view class="cart-qty__btn" @click="cart.changeLocalQty(idx, -1)">−</view>
          <text class="cart-qty__num">{{ item.qty }}</text>
          <view class="cart-qty__btn" @click="cart.changeLocalQty(idx, 1)">+</view>
        </view>
      </view>
    </view>

    <template v-if="!empty" #footer>
      <view class="cart-cta">
        <view class="cart-cta__sum">
          <text class="t-caption">合计</text>
          <text class="ps-price">¥{{ cart.cartTotal }}</text>
        </view>
        <view
          class="cart-cta__btn"
          hover-class="cart-cta__btn--active"
          @click="goCheckout"
        >
          <text class="cart-cta__btn-label">确认下单</text>
        </view>
      </view>
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
  align-items: center;
}

.cart-row__img {
  width: 128rpx;
  height: 128rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background: $mp-stone;
}

.cart-row__body {
  flex: 1;
  min-width: 0;
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

.cart-qty {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  border: 1rpx solid $mp-border;
  border-radius: 8rpx;
  padding: 4rpx 8rpx;
}

.cart-qty__btn {
  width: 48rpx;
  height: 48rpx;
  font-size: 28rpx;
  color: $mp-text-2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-qty__num {
  min-width: 32rpx;
  text-align: center;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 28rpx;
}

.cart-cta {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}

.cart-cta__sum {
  text-align: center;
}

.ps-price {
  display: block;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 44rpx;
  font-weight: 500;
}

.cart-cta__btn {
  width: 600rpx;
  box-sizing: border-box;
  min-height: 96rpx;
  padding: 0 32rpx;
  border-radius: 8rpx;
  background: $mp-moss;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-cta__btn--active {
  opacity: 0.92;
  transform: scale(0.98);
  background: $mp-moss-deep;
}

.cart-cta__btn-label {
  font-size: 34rpx;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.1em;
  color: $mp-paper;
  text-align: center;
}
</style>
