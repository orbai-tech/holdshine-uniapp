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
import type { FulfillmentMode } from '@/common/types/fulfillment'
import { lineAmount, useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { formatItemSpec } from '@/utils/orderItemLabel'
import { applyMemberDiscount, formatMemberGoodsMoney } from '@/utils/pricing'

const session = useSessionStore()
const cart = useCartStore()
const catalog = useCatalogStore()

const usingRemote = computed(() => Boolean(cart.remote))
const empty = computed(() =>
  usingRemote.value ? cart.remoteItems.length === 0 : cart.items.length === 0,
)
const activeMode = computed<FulfillmentMode>(() =>
  session.fulfillmentMode === 'delivery' ? 'delivery' : 'dine_in',
)

/** 购物袋底部合计：原价 → 会员折（饮品两位小数） */
const displayCartTotal = computed(() => {
  const original = cart.cartTotal
  const after = applyMemberDiscount(original, session.coffeeDiscountRate, 'coffee')
  return formatMemberGoodsMoney(after, 'coffee')
})

watch(
  () => session.cartOpen,
  (open) => {
    if (!open || catalog.currentStoreId == null) return
    void session.refreshMemberRates()
    void Promise.all([cart.refreshCart(), cart.refreshOverview()])
  },
)

async function onModeTap(mode: FulfillmentMode) {
  if (mode === activeMode.value) return
  session.setFulfillmentMode(mode)
  await Promise.all([cart.refreshCart(), cart.refreshOverview()])
}

function goMenu() {
  session.goMenu()
}

function goCheckout() {
  session.setCartOpen(false)
  uni.navigateTo({
    url: '/pages/checkout/index',
    fail() {},
  })
}

function onClearCart() {
  if (!usingRemote.value || empty.value || cart.writeBusy) return
  uni.showModal({
    title: '清空购物袋',
    content: '确定清空当前购物袋吗？',
    success(res) {
      if (res.confirm) void cart.clearRemoteCart()
    },
  })
}

/** product_id 是 18 位雪花大整数（string），string 透传 */
function itemImage(productId: string) {
  return catalog.findProduct(productId)?.img || '/static/images/products/latte.jpg'
}

function badgeText(count: number) {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}
</script>

<template>
  <SoorakSheet :open="session.cartOpen" title="购物袋" @close="session.setCartOpen(false)">
    <view class="cart-fulfill">
      <view
        class="cart-fulfill__item"
        :class="{ 'is-on': activeMode === 'dine_in' }"
        @click="onModeTap('dine_in')"
      >
        <text>堂食</text>
        <text v-if="badgeText(cart.dineInCount)" class="cart-fulfill__badge">
          {{ badgeText(cart.dineInCount) }}
        </text>
      </view>
      <view
        class="cart-fulfill__item"
        :class="{ 'is-on': activeMode === 'delivery' }"
        @click="onModeTap('delivery')"
      >
        <text>外卖</text>
        <text v-if="badgeText(cart.takeawayCount)" class="cart-fulfill__badge">
          {{ badgeText(cart.takeawayCount) }}
        </text>
      </view>
    </view>

    <view v-if="empty" class="mp-empty">
      <text class="mp-empty__title">购物袋是空的</text>
      <text class="t-caption">去点一杯此刻需要的饮品</text>
      <SoorakButton @click="goMenu">去点单</SoorakButton>
    </view>
    <view v-else-if="usingRemote" class="cart-list">
      <view class="cart-list__toolbar">
        <text class="cart-list__clear" @click="onClearCart">清空</text>
      </view>
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
            {{ item.product.cat !== 'retail' ? `${item.size} / ${item.temp}` : '标准装'
            }}{{ item.extras.length ? ` · ${item.extras.join(' · ')}` : '' }}
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
          <text class="ps-price">¥{{ displayCartTotal }}</text>
        </view>
        <view class="cart-cta__btn" hover-class="cart-cta__btn--active" @click="goCheckout">
          <text class="cart-cta__btn-label">确认下单</text>
        </view>
      </view>
    </template>
  </SoorakSheet>
</template>

<style lang="scss" scoped>
.cart-fulfill {
  display: flex;
  gap: 12rpx;
  padding: 8rpx 32rpx 16rpx;
}

.cart-fulfill__item {
  flex: 1;
  min-height: 72rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: $mp-text-2;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  background: $mp-cloud;
}

.cart-fulfill__item.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
  font-weight: 500;
}

.cart-fulfill__badge {
  min-width: 28rpx;
  padding: 0 8rpx;
  height: 28rpx;
  border-radius: 14rpx;
  font-size: 18rpx;
  line-height: 28rpx;
  text-align: center;
  background: $mp-brass;
  color: $mp-paper;
}

.cart-fulfill__item.is-on .cart-fulfill__badge {
  background: rgba(247, 244, 238, 0.28);
}

.cart-list {
  padding: 16rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.cart-list__toolbar {
  display: flex;
  justify-content: flex-end;
}

.cart-list__clear {
  font-size: 24rpx;
  color: $mp-text-2;
  padding: 8rpx 0;
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
  font-family: 'Songti SC', 'Noto Serif SC', serif;
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
  font-family: 'Songti SC', 'Noto Serif SC', serif;
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
  font-family: 'Songti SC', 'Noto Serif SC', serif;
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
