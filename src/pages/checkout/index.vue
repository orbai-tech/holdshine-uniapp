<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import { listMyCoupons } from '@/common/apis/couponApi'
import type { MyCouponRes } from '@/common/types/coupon'
import type { TableCode } from '@/common/types/fulfillment'
import { TABLE_CODE_OPTIONS } from '@/common/types/fulfillment'
import { lineAmount, useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { formatItemSpec } from '@/utils/orderItemLabel'
import { parseAmount } from '@/utils/money'
import {
  calcCouponDiscount,
  calcPayable,
  evaluateCouponsForSubtotal,
} from '@/utils/pricing'

const session = useSessionStore()
const cart = useCartStore()
const catalog = useCatalogStore()

const remark = ref('')
const tableSheetOpen = ref(false)
const couponSheetOpen = ref(false)
/** 选中的顾客券；折扣本地试算，支付时交后端重算核销 */
const selectedCouponId = ref<string | null>(null)
const coupons = ref<MyCouponRes[]>([])
const couponsBusy = ref(false)

const usingRemote = computed(() => Boolean(cart.remote))
const empty = computed(() =>
  usingRemote.value ? cart.remoteItems.length === 0 : cart.items.length === 0,
)
const isDelivery = computed(() => session.fulfillmentMode === 'delivery')
const itemCount = computed(() => cart.cartCount)
const addressLine = computed(() => {
  const addr = session.deliveryAddress
  if (!addr) return ''
  return `${addr.region} ${addr.door}`
})
const tableLabel = computed(() => {
  if (session.pickupSubMode !== 'dine_in') return ''
  return session.tableCode ? `桌码 ${session.tableCode}` : '桌码 无'
})

/** 商品小计：有 remote 用服务端商品+加料；否则本地累加 */
const goodsSubtotal = computed(() => {
  if (cart.remote) {
    return (
      parseAmount(cart.remote.product_amount) + parseAmount(cart.remote.option_amount)
    )
  }
  return cart.items.reduce((sum, item) => sum + lineAmount(item), 0)
})

const evaluatedCoupons = computed(() =>
  evaluateCouponsForSubtotal(coupons.value, goodsSubtotal.value),
)

const selectedCoupon = computed(() =>
  evaluatedCoupons.value.find((item) => item.customer_coupon_id === selectedCouponId.value) ??
  null,
)

const discountAmount = computed(() => {
  if (!selectedCoupon.value) return 0
  return calcCouponDiscount(goodsSubtotal.value, selectedCoupon.value).discount
})

const discountAmountText = computed(() => discountAmount.value.toFixed(2))

const displayTotal = computed(() => calcPayable(goodsSubtotal.value, discountAmount.value))

const couponLabel = computed(() => {
  if (couponsBusy.value && !coupons.value.length) return '加载中…'
  if (selectedCouponId.value == null) {
    const usableCount = evaluatedCoupons.value.filter((item) => item.usable).length
    return usableCount ? `${usableCount} 张可用` : '暂无可用优惠券'
  }
  const hit = selectedCoupon.value
  const title = hit?.title ?? hit?.template?.coupon_name
  return hit && title ? `已选 ${title}` : '已选优惠券'
})

const couponValueClass = computed(() =>
  selectedCouponId.value != null || discountAmount.value > 0
    ? ''
    : 'ck-row__value--muted',
)

async function refreshCoupons() {
  if (empty.value || !session.loggedIn) {
    coupons.value = []
    return
  }
  couponsBusy.value = true
  try {
    coupons.value = await listMyCoupons()
    if (
      selectedCouponId.value != null &&
      !coupons.value.some((item) => item.customer_coupon_id === selectedCouponId.value)
    ) {
      selectedCouponId.value = null
    }
  } catch (error) {
    coupons.value = []
    uni.showToast({ title: toErrorMessage(error, '优惠券加载失败').slice(0, 40), icon: 'none' })
  } finally {
    couponsBusy.value = false
  }
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  if (catalog.currentStoreId != null) {
    void cart.refreshCart().then(() => refreshCoupons())
  }
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
})

watch(
  () => cart.remote?.payable_amount,
  () => {
    if (
      selectedCouponId.value != null &&
      selectedCoupon.value &&
      !selectedCoupon.value.usable
    ) {
      selectedCouponId.value = null
    }
  },
)

function itemImage(productId: number) {
  return catalog.findProduct(String(productId))?.img || '/static/images/products/latte.jpg'
}

function remoteSpec(item: { sku_name?: string | null; options?: { option_name?: string }[] }) {
  return formatItemSpec(item) || '标准装'
}

function openAddress() {
  session.openAddressEditor()
}

function onTapDineIn() {
  session.setPickupSubMode('dine_in')
  tableSheetOpen.value = true
}

function onTapPack() {
  session.setPickupSubMode('pack')
}

function pickTable(code: TableCode | null) {
  session.setTableCode(code)
  tableSheetOpen.value = false
}

function tableOptionLabel(code: TableCode | null) {
  return code ?? '无'
}

function openCouponSheet() {
  couponSheetOpen.value = true
  void refreshCoupons()
}

function pickCoupon(coupon: MyCouponRes | null) {
  if (coupon && !coupon.usable) {
    uni.showToast({ title: coupon.unusable_reason || '不可用', icon: 'none' })
    return
  }
  selectedCouponId.value = coupon?.customer_coupon_id ?? null
  couponSheetOpen.value = false
}

async function submitPay() {
  if (cart.writeBusy) return
  if (empty.value) {
    uni.showToast({ title: '购物袋是空的', icon: 'none' })
    return
  }
  if (session.fulfillmentMode == null) {
    uni.showToast({ title: '请选择取餐方式', icon: 'none' })
    return
  }
  if (isDelivery.value && !session.deliveryAddress) {
    uni.showToast({ title: '请选择收货地址', icon: 'none' })
    return
  }
  uni.showLoading({ title: '提交中', mask: true })
  try {
    await cart.submitCheckout({
      remark: remark.value,
      customer_coupon_id: selectedCouponId.value,
      client_payable_amount: displayTotal.value,
    })
  } catch (error) {
    uni.showToast({ title: toErrorMessage(error, '提交失败').slice(0, 40), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<template>
  <SoorakChrome title="确认订单" show-back>
    <view v-if="empty" class="mp-empty">
      <text class="mp-empty__title">购物袋是空的</text>
      <text class="t-caption">先去点一杯</text>
      <SoorakButton @click="session.goTab('/pages/menu/index')">去点单</SoorakButton>
    </view>

    <view v-else class="page-checkout">
      <!-- 外卖：地址 + 送达时间 -->
      <template v-if="isDelivery">
        <view class="ck-card ck-addr-card" @click="openAddress">
          <view class="ck-addr">
            <text class="ck-addr__title" :class="{ 'is-empty': !addressLine }">
              {{ addressLine || '请选择收货地址' }}
            </text>
            <text v-if="session.deliveryAddress" class="ck-addr__meta">
              {{ session.deliveryAddress.name }}{{ session.deliveryAddress.gender }}
              {{ session.deliveryAddress.phone }}
            </text>
          </view>
          <text class="ck-arrow">›</text>
        </view>

        <view class="ck-card ck-row">
          <text class="ck-row__label">送达时间</text>
          <text class="ck-row__value">尽快送达</text>
          <text class="ck-arrow">›</text>
        </view>
      </template>

      <!-- 堂食：门店 + 预约 + 店内就餐/打包 -->
      <template v-else>
        <view class="ck-card ck-store">
          <view class="ck-store__body">
            <text class="ck-store__name">{{ catalog.brand?.store || '门店' }}</text>
            <text class="ck-store__meta">
              {{ catalog.currentStore?.address || catalog.brand?.hours || '' }}
            </text>
            <text class="ck-store__hint">现在下单，立即制作</text>
          </view>
          <text class="ck-store__dist">{{ catalog.brand?.distance || '—' }}</text>
        </view>

        <view class="ck-card ck-row">
          <text class="ck-row__label">预约时间</text>
          <text class="ck-row__value">立即取餐</text>
          <text class="ck-arrow">›</text>
        </view>

        <view class="ck-modes">
          <view
            class="ck-mode"
            :class="{ 'is-on': session.pickupSubMode === 'dine_in' }"
            @click="onTapDineIn"
          >
            <text class="ck-mode__title">店内就餐</text>
            <text class="ck-mode__sub">{{ tableLabel || '选择桌码' }}</text>
            <text v-if="session.pickupSubMode === 'dine_in'" class="ck-mode__check">✓</text>
          </view>
          <view
            class="ck-mode"
            :class="{ 'is-on': session.pickupSubMode === 'pack' }"
            @click="onTapPack"
          >
            <text class="ck-mode__title">打包外带</text>
            <text class="ck-mode__sub">到店自取</text>
            <text v-if="session.pickupSubMode === 'pack'" class="ck-mode__check">✓</text>
          </view>
        </view>
      </template>

      <view class="ck-card ck-goods">
        <text v-if="isDelivery" class="ck-goods__store">{{ catalog.brand?.store || '门店' }}</text>

        <view v-if="usingRemote" class="ck-list">
          <view v-for="item in cart.remoteItems" :key="item.item_id" class="ck-item">
            <image :src="itemImage(item.product_id)" mode="aspectFill" class="ck-item__img" />
            <view class="ck-item__body">
              <view class="ck-item__top">
                <text class="ck-item__name">{{ item.product_name }}</text>
                <text class="ck-item__price">¥{{ cart.itemLineAmount(item) }}</text>
              </view>
              <text class="ck-item__meta">{{ remoteSpec(item) }}</text>
              <text class="ck-item__qty">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
        <view v-else class="ck-list">
          <view
            v-for="(item, idx) in cart.items"
            :key="`${item.product.id}-${idx}`"
            class="ck-item"
          >
            <image :src="item.product.img" mode="aspectFill" class="ck-item__img" />
            <view class="ck-item__body">
              <view class="ck-item__top">
                <text class="ck-item__name">{{ item.product.name }}</text>
                <text class="ck-item__price">¥{{ lineAmount(item) }}</text>
              </view>
              <text class="ck-item__meta">
                {{
                  item.product.cat !== 'retail'
                    ? `${item.size} / ${item.temp}`
                    : '标准装'
                }}{{ item.extras.length ? ` · ${item.extras.join(' · ')}` : '' }}
              </text>
              <text class="ck-item__qty">x{{ item.qty }}</text>
            </view>
          </view>
        </view>

        <view class="ck-row ck-row--inset" @click="openCouponSheet">
          <text class="ck-row__label">优惠券</text>
          <text class="ck-row__value" :class="couponValueClass">{{ couponLabel }}</text>
          <text class="ck-arrow">›</text>
        </view>

        <view v-if="discountAmount > 0" class="ck-discount">
          <text>优惠</text>
          <text class="ck-discount__val">-¥{{ discountAmountText }}</text>
        </view>

        <view class="ck-total">
          <text>合计</text>
          <text class="ck-total__price">¥{{ displayTotal }}</text>
        </view>
      </view>

      <view class="ck-card ck-row">
        <text class="ck-row__label">备注</text>
        <input
          v-model="remark"
          class="ck-remark"
          type="text"
          placeholder="口味偏好等"
          placeholder-class="addr-ph"
        />
      </view>

      <view class="ck-spacer" />
    </view>

    <view v-if="!empty" class="ck-bar">
      <view class="ck-bar__sum">
        <text class="ck-bar__count">共{{ itemCount }}件 合计</text>
        <text class="ck-bar__price">¥{{ displayTotal }}</text>
      </view>
      <view class="ck-bar__btn" hover-class="ck-bar__btn--active" @click="submitPay">
        <text>提交支付</text>
      </view>
    </view>

    <SoorakSheet :open="tableSheetOpen" title="选择桌码" @close="tableSheetOpen = false">
      <view class="table-list">
        <view
          v-for="code in TABLE_CODE_OPTIONS"
          :key="tableOptionLabel(code)"
          class="table-option"
          :class="{
            'is-on':
              session.pickupSubMode === 'dine_in' &&
              ((code == null && session.tableCode == null) || session.tableCode === code),
          }"
          @click="pickTable(code)"
        >
          <text>{{ tableOptionLabel(code) }}</text>
        </view>
      </view>
    </SoorakSheet>

    <SoorakSheet :open="couponSheetOpen" title="选择优惠券" @close="couponSheetOpen = false">
      <view class="coupon-list">
        <view
          class="coupon-option"
          :class="{ 'is-on': selectedCouponId == null }"
          @click="pickCoupon(null)"
        >
          <text>不使用优惠券</text>
        </view>
        <view
          v-for="coupon in evaluatedCoupons"
          :key="coupon.customer_coupon_id"
          class="coupon-option"
          :class="{
            'is-on': selectedCouponId === coupon.customer_coupon_id,
            'is-disabled': !coupon.usable,
          }"
          @click="pickCoupon(coupon)"
        >
          <view class="coupon-option__main">
            <text class="coupon-option__title">{{
              coupon.title || coupon.template?.coupon_name || '优惠券'
            }}</text>
            <text class="coupon-option__meta">
              {{
                coupon.usable
                  ? `可减 ¥${coupon.discount_amount || coupon.template?.discount_amount || coupon.reduce_amount}`
                  : coupon.unusable_reason || '不可用'
              }}
            </text>
          </view>
        </view>
      </view>
    </SoorakSheet>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.page-checkout {
  padding: 16rpx 32rpx 180rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.ck-card {
  background: $mp-cloud;
  border-radius: 16rpx;
  padding: 28rpx;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.ck-addr-card {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ck-addr {
  flex: 1;
  min-width: 0;
}

.ck-addr__title {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
  color: $mp-text;
}

.ck-addr__title.is-empty {
  color: $mp-text-3;
}

.ck-addr__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $mp-text-2;
}

.ck-arrow {
  font-size: 32rpx;
  color: $mp-text-3;
  flex-shrink: 0;
}

.ck-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ck-row--inset {
  margin-top: 8rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid $mp-border;
  padding-left: 0;
  padding-right: 0;
  box-shadow: none;
  background: transparent;
  border-radius: 0;
}

.ck-row__label {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 500;
}

.ck-row__value {
  flex: 1;
  text-align: right;
  font-size: 26rpx;
  color: $mp-text;
}

.ck-row__value--muted {
  color: $mp-text-3;
}

.ck-store {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24rpx;
}

.ck-store__name {
  display: block;
  font-size: 30rpx;
  font-weight: 500;
}

.ck-store__meta {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $mp-text-2;
}

.ck-store__hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: $mp-brass;
}

.ck-store__dist {
  flex-shrink: 0;
  font-size: 22rpx;
  color: $mp-text-2;
}

.ck-modes {
  display: flex;
  gap: 16rpx;
}

.ck-mode {
  position: relative;
  flex: 1;
  min-height: 140rpx;
  padding: 28rpx 24rpx;
  border-radius: 16rpx;
  background: $mp-cloud;
  box-shadow: inset 0 0 0 1rpx $mp-border;
}

.ck-mode.is-on {
  box-shadow: inset 0 0 0 2rpx $mp-moss;
  background: rgba(51, 71, 61, 0.06);
}

.ck-mode__title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
}

.ck-mode__sub {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $mp-text-2;
}

.ck-mode__check {
  position: absolute;
  right: 16rpx;
  bottom: 12rpx;
  font-size: 24rpx;
  color: $mp-moss;
}

.ck-goods__store {
  display: block;
  margin-bottom: 20rpx;
  font-size: 26rpx;
  font-weight: 500;
}

.ck-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.ck-item {
  display: flex;
  gap: 20rpx;
}

.ck-item__img {
  width: 112rpx;
  height: 112rpx;
  border-radius: 8rpx;
  background: $mp-stone;
  flex-shrink: 0;
}

.ck-item__body {
  flex: 1;
  min-width: 0;
}

.ck-item__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}

.ck-item__name {
  font-size: 28rpx;
  font-weight: 500;
}

.ck-item__price {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 28rpx;
  flex-shrink: 0;
}

.ck-item__meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $mp-text-2;
}

.ck-item__qty {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $mp-text-3;
}

.ck-total {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $mp-border;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 12rpx;
  font-size: 24rpx;
  color: $mp-text-2;
}

.ck-discount {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 12rpx;
  font-size: 24rpx;
  color: $mp-text-2;
}

.ck-discount__val {
  color: $mp-brass;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 28rpx;
}

.ck-total__price {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 500;
  color: $mp-text;
}

.ck-remark {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 26rpx;
  color: $mp-text;
}

.ck-spacer {
  height: 16rpx;
}

.ck-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(247, 244, 238, 0.96);
  border-top: 1rpx solid $mp-border;
}

.ck-bar__sum {
  min-width: 0;
}

.ck-bar__count {
  display: block;
  font-size: 22rpx;
  color: $mp-text-2;
}

.ck-bar__price {
  display: block;
  margin-top: 4rpx;
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 40rpx;
  font-weight: 500;
}

.ck-bar__btn {
  flex-shrink: 0;
  min-width: 240rpx;
  min-height: 88rpx;
  padding: 0 36rpx;
  border-radius: 8rpx;
  background: $mp-moss;
  color: $mp-paper;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 500;
  letter-spacing: 0.08em;
}

.ck-bar__btn--active {
  opacity: 0.92;
  background: $mp-moss-deep;
}

.table-list {
  padding: 16rpx 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.table-option {
  min-height: 96rpx;
  padding: 0 28rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-size: 30rpx;
  color: $mp-text;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  background: $mp-cloud;
}

.table-option.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
}

.addr-ph {
  color: $mp-text-3;
}

.coupon-list {
  padding: 16rpx 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.coupon-option {
  min-height: 96rpx;
  padding: 20rpx 28rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-size: 28rpx;
  color: $mp-text;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  background: $mp-cloud;
}

.coupon-option.is-on {
  box-shadow: inset 0 0 0 2rpx $mp-moss;
  background: rgba(51, 71, 61, 0.06);
}

.coupon-option.is-disabled {
  opacity: 0.55;
}

.coupon-option__main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.coupon-option__title {
  font-size: 28rpx;
  font-weight: 500;
}

.coupon-option__meta {
  font-size: 22rpx;
  color: $mp-text-2;
}
</style>
