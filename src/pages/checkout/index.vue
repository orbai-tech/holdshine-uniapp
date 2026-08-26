<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onHide, onShow, onUnload } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import { quoteDelivery } from '@/common/apis/deliveryApi'
import { listMyCoupons, listUsableCoupons } from '@/common/apis/couponApi'
import { listAvailableTables } from '@/common/apis/tableApi'
import type { DeliveryQuoteRes } from '@/common/types/delivery'
import type { MyCouponRes } from '@/common/types/coupon'
import type { MpAvailableTableRes } from '@/common/types/table'
import { lineAmount, useCartStore } from '@/stores/cart'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import {
  calcDeliveryPayable,
  canSubmitDeliveryQuote,
  parseAddressId,
} from '@/utils/deliveryCheckout'
import { toErrorMessage } from '@/utils/errorMessage'
import { formatItemSpec } from '@/utils/orderItemLabel'
import { parseAmount } from '@/utils/money'
import {
  applyMemberDiscount,
  calcCouponDiscount,
  calcPayable,
  evaluateCouponsForSubtotal,
  formatMemberGoodsMoney,
  memberSaveAmount,
  mergeCouponUsableFlags,
} from '@/utils/pricing'
import { toServiceMode } from '@/common/types/orderEnums'
import { orderCheckoutIntent } from '@/utils/clientToken'
import { createDebounced } from '@/utils/timing'

const session = useSessionStore()
const cart = useCartStore()
const catalog = useCatalogStore()

const remark = ref('')
const tableSheetOpen = ref(false)
const availableTables = ref<MpAvailableTableRes[]>([])
const tablesBusy = ref(false)
const tablesHint = ref('')
const couponSheetOpen = ref(false)
/** 选中的顾客券；列表来自 usable，折扣由前端本地试算 */
const selectedCouponId = ref<string | null>(null)
const coupons = ref<MyCouponRes[]>([])
const couponsBusy = ref(false)
/** true = 列表来自 GET .../coupons/usable */
const couponsFromUsable = ref(false)

const deliveryQuote = ref<DeliveryQuoteRes | null>(null)
const deliveryQuoteBusy = ref(false)
const deliveryQuoteHint = ref('')
const CHECKOUT_DEBOUNCE_MS = 300
let deliveryQuoteSeq = 0

/** 当前门店是否可下单；休息/暂停接单时禁止提交支付 */
const canOrder = computed(() => catalog.canOrder)

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
  if (session.tableName) return session.tableName
  if (session.tableCode) return `桌码 ${session.tableCode}`
  return '桌码 无'
})

const hasScannedTable = computed(() => session.tableFromScan && session.tableId != null)

/** 商品小计：有 remote 用服务端商品+加料；否则本地累加（会员折前原价） */
const goodsSubtotal = computed(() => {
  if (cart.remote) {
    return (
      parseAmount(cart.remote.product_amount) + parseAmount(cart.remote.option_amount)
    )
  }
  return cart.items.reduce((sum, item) => sum + lineAmount(item), 0)
})

/** 原价 → 会员折（饮品两位小数）；未开通则等于原价 */
const afterMemberSubtotal = computed(() =>
  applyMemberDiscount(goodsSubtotal.value, session.coffeeDiscountRate, 'coffee'),
)

const memberSave = computed(() =>
  memberSaveAmount(goodsSubtotal.value, afterMemberSubtotal.value),
)

const memberSaveText = computed(() => formatMemberGoodsMoney(memberSave.value, 'coffee'))

const evaluatedCoupons = computed(() => {
  const local = evaluateCouponsForSubtotal(coupons.value, afterMemberSubtotal.value)
  if (!couponsFromUsable.value) return local
  return mergeCouponUsableFlags(local, coupons.value)
})

const selectedCoupon = computed(() =>
  evaluatedCoupons.value.find((item) => item.customer_coupon_id === selectedCouponId.value) ??
  null,
)

const discountAmount = computed(() => {
  if (!selectedCoupon.value) return 0
  return calcCouponDiscount(afterMemberSubtotal.value, selectedCoupon.value).discount
})

const discountAmountText = computed(() => discountAmount.value.toFixed(2))

/** 会员折后小计 − 券；再加包装/配送（外卖） */
const goodsPayable = computed(() =>
  calcPayable(afterMemberSubtotal.value, discountAmount.value),
)

const displayTotal = computed(() => {
  if (!isDelivery.value) return goodsPayable.value
  return calcDeliveryPayable(goodsPayable.value, deliveryQuote.value)
})

const displayTotalText = computed(() => displayTotal.value.toFixed(2))

const afterMemberText = computed(() =>
  formatMemberGoodsMoney(afterMemberSubtotal.value, 'coffee'),
)

const deliveryFeeText = computed(() =>
  deliveryQuote.value ? deliveryQuote.value.delivery_fee : '—',
)
const packingFeeText = computed(() =>
  deliveryQuote.value ? deliveryQuote.value.packing_fee : '—',
)

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

function clearDeliveryQuote() {
  deliveryQuote.value = null
  deliveryQuoteHint.value = ''
}

function discardInFlightQuote() {
  deliveryQuoteSeq += 1
  deliveryQuoteBusy.value = false
}

async function refreshDeliveryQuote() {
  if (!isDelivery.value) {
    discardInFlightQuote()
    clearDeliveryQuote()
    return
  }
  const storeId = catalog.currentStoreId
  const addressId = parseAddressId(session.deliveryAddress?.address_id)
  if (storeId == null || addressId == null) {
    discardInFlightQuote()
    clearDeliveryQuote()
    deliveryQuoteHint.value = addressId == null ? '请先保存收货地址后再询价' : ''
    return
  }
  if (empty.value) {
    discardInFlightQuote()
    clearDeliveryQuote()
    return
  }

  const seq = ++deliveryQuoteSeq
  deliveryQuoteBusy.value = true
  try {
    // 产品默认微信即时配送；询价走真实后端（见 ACTIVE_DELIVERY_PROVIDER）
    const quote = await quoteDelivery({
      store_id: storeId,
      address_id: addressId,
      product_amount: afterMemberSubtotal.value,
    })
    if (seq !== deliveryQuoteSeq) return
    deliveryQuote.value = quote
    deliveryQuoteHint.value = quote.message || ''
  } catch (error) {
    if (seq !== deliveryQuoteSeq) return
    clearDeliveryQuote()
    deliveryQuoteHint.value = toErrorMessage(error, '配送询价失败').slice(0, 40)
  } finally {
    if (seq === deliveryQuoteSeq) deliveryQuoteBusy.value = false
  }
}

const scheduleRefreshCoupons = createDebounced(() => {
  void refreshCoupons()
}, CHECKOUT_DEBOUNCE_MS)

const scheduleRefreshDeliveryQuote = createDebounced(() => {
  void refreshDeliveryQuote()
}, CHECKOUT_DEBOUNCE_MS)

async function refreshCoupons() {
  if (empty.value || !session.loggedIn) {
    coupons.value = []
    couponsFromUsable.value = false
    return
  }
  const storeId = catalog.currentStoreId
  if (storeId == null) {
    coupons.value = []
    couponsFromUsable.value = false
    return
  }
  couponsBusy.value = true
  try {
    const serviceMode = toServiceMode(session) ?? 1
    try {
      coupons.value = await listUsableCoupons({
        store_id: storeId,
        goods_amount: goodsSubtotal.value,
        service_mode: serviceMode,
      })
      couponsFromUsable.value = true
    } catch {
      const mine = await listMyCoupons()
      coupons.value = mine.list
      couponsFromUsable.value = false
    }
    if (
      selectedCouponId.value != null &&
      !coupons.value.some((item) => item.customer_coupon_id === selectedCouponId.value)
    ) {
      selectedCouponId.value = null
    }
  } catch (error) {
    coupons.value = []
    couponsFromUsable.value = false
    uni.showToast({ title: toErrorMessage(error, '优惠券加载失败').slice(0, 40), icon: 'none' })
  } finally {
    couponsBusy.value = false
  }
}

onShow(() => {
  session.hideNativeTabBar()
  session.setSuppressTabBar(true)
  // 未选履约时确认单仍展示堂食 UI（pickupSubMode 默认 dine_in），与提交校验对齐
  if (session.fulfillmentMode == null) {
    session.setFulfillmentMode('dine_in')
  }
  void session.refreshMemberRates()
  if (catalog.currentStoreId != null) {
    void cart.refreshCart().then(async () => {
      await refreshCoupons()
      if (isDelivery.value) {
        await refreshDeliveryQuote()
      }
    })
  }
})

onHide(() => {
  session.setSuppressTabBar(false)
})

onUnload(() => {
  session.setSuppressTabBar(false)
  scheduleRefreshCoupons.cancel()
  scheduleRefreshDeliveryQuote.cancel()
  discardInFlightQuote()
  orderCheckoutIntent.clear()
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

watch(afterMemberSubtotal, () => {
  if (!session.loggedIn || empty.value) return
  scheduleRefreshCoupons()
})

watch(
  [
    isDelivery,
    () => session.deliveryAddress?.address_id,
    afterMemberSubtotal,
    () => catalog.currentStoreId,
  ],
  () => {
    if (!isDelivery.value) {
      scheduleRefreshDeliveryQuote.cancel()
      discardInFlightQuote()
      clearDeliveryQuote()
      return
    }
    scheduleRefreshDeliveryQuote()
  },
)

watch(
  () => session.coffeeDiscountRate,
  () => {
    if (!session.loggedIn || empty.value) return
    scheduleRefreshCoupons()
    if (isDelivery.value) scheduleRefreshDeliveryQuote()
  },
)

/** product_id 是 18 位雪花大整数（string），string 透传 */
function itemImage(productId: string) {
  return catalog.findProduct(productId)?.img || '/static/images/products/latte.jpg'
}

function remoteSpec(item: { sku_name?: string | null; options?: { option_name?: string }[] }) {
  return formatItemSpec(item) || '标准装'
}

function openAddress() {
  session.openAddressBook()
}

function onTapDineIn() {
  session.setPickupSubMode('dine_in')
  // 扫码入座或刚从打包恢复的桌台：不再弹选桌，避免 mock 占用态把原桌打成「不可选」
  if (hasScannedTable.value || session.tableId != null) return
  void openTableSheet()
}

function onTapPack() {
  session.setPickupSubMode('pack')
}

async function openTableSheet() {
  tableSheetOpen.value = true
  const storeId = catalog.currentStoreId
  if (storeId == null) {
    availableTables.value = []
    tablesHint.value = '请先选择门店'
    return
  }
  tablesBusy.value = true
  tablesHint.value = ''
  try {
    const data = await listAvailableTables(storeId)
    availableTables.value = data.list ?? []
    if (!availableTables.value.length) {
      tablesHint.value = '暂无可选桌台'
    }
  } catch (error) {
    availableTables.value = []
    tablesHint.value = toErrorMessage(error, '桌台加载失败')
    uni.showToast({ title: tablesHint.value.slice(0, 40), icon: 'none' })
  } finally {
    tablesBusy.value = false
  }
}

function pickTable(table: MpAvailableTableRes | null) {
  if (table && !table.selectable) {
    uni.showToast({ title: '该桌台不可选', icon: 'none' })
    return
  }
  try {
    session.applyAvailableTable(
      table
        ? {
            table_id: table.table_id,
            table_code: table.table_code,
            table_name: table.table_name,
          }
        : null,
    )
    tableSheetOpen.value = false
  } catch (error) {
    uni.showToast({
      title: toErrorMessage(error, '选桌失败').slice(0, 40),
      icon: 'none',
    })
  }
}

function tableStatusLabel(table: MpAvailableTableRes) {
  if (table.selectable) return '空闲可选'
  if (table.table_status === 2) return '用餐中'
  if (table.table_status === 3) return '待清台'
  if (table.table_status === 0) return '已停用'
  return '不可选'
}

function isTableSelected(table: MpAvailableTableRes) {
  return (
    session.pickupSubMode === 'dine_in' &&
    session.tableId != null &&
    String(session.tableId) === String(table.table_id)
  )
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
  if (!canOrder.value) {
    uni.showToast({ title: '门店休息中，暂不可下单', icon: 'none' })
    return
  }
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
  if (isDelivery.value && parseAddressId(session.deliveryAddress?.address_id) == null) {
    uni.showToast({ title: '请先保存收货地址', icon: 'none' })
    return
  }
  if (isDelivery.value && !canSubmitDeliveryQuote(deliveryQuote.value)) {
    uni.showToast({
      title: (deliveryQuote.value?.message || deliveryQuoteHint.value || '暂不可配送').slice(0, 40),
      icon: 'none',
    })
    return
  }
  uni.showLoading({ title: '提交中', mask: true })
  try {
    await cart.submitCheckout({
      remark: remark.value,
      customer_coupon_id: selectedCouponId.value,
      expected_payable: displayTotal.value,
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
      <SoorakButton @click="session.goMenu()">去点单</SoorakButton>
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

        <view class="ck-card ck-row">
          <text class="ck-row__label">配送费</text>
          <text class="ck-row__value" :class="{ 'ck-row__value--muted': !deliveryQuote }">
            {{ deliveryQuoteBusy ? '询价中…' : `¥${deliveryFeeText}` }}
          </text>
        </view>
        <view class="ck-card ck-row">
          <text class="ck-row__label">包装费</text>
          <text class="ck-row__value" :class="{ 'ck-row__value--muted': !deliveryQuote }">
            {{ deliveryQuoteBusy ? '询价中…' : `¥${packingFeeText}` }}
          </text>
        </view>
        <text v-if="deliveryQuoteHint" class="ck-delivery-hint t-caption">{{ deliveryQuoteHint }}</text>
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

        <view v-if="memberSave > 0" class="ck-discount">
          <text>会员优惠</text>
          <text class="ck-discount__val">-¥{{ memberSaveText }}</text>
        </view>

        <view v-if="discountAmount > 0" class="ck-discount">
          <text>优惠券</text>
          <text class="ck-discount__val">-¥{{ discountAmountText }}</text>
        </view>

        <view class="ck-total">
          <text>合计</text>
          <text class="ck-total__price">¥{{ displayTotalText }}</text>
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
        <text class="ck-bar__price">¥{{ displayTotalText }}</text>
      </view>
      <view
        class="ck-bar__btn"
        :class="{ 'ck-bar__btn--off': !canOrder }"
        :hover-class="canOrder ? 'ck-bar__btn--active' : ''"
        @click="submitPay"
      >
        <text>{{ canOrder ? '提交支付' : '休息中' }}</text>
      </view>
    </view>

    <SoorakSheet :open="tableSheetOpen" title="选择桌台" @close="tableSheetOpen = false">
      <view class="table-list">
        <view v-if="tablesBusy" class="table-hint">
          <text class="t-caption">加载桌台…</text>
        </view>
        <view v-else-if="tablesHint" class="table-hint">
          <text class="t-caption">{{ tablesHint }}</text>
        </view>
        <view
          class="table-option"
          :class="{
            'is-on': session.pickupSubMode === 'dine_in' && session.tableId == null,
          }"
          @click="pickTable(null)"
        >
          <text>无桌码</text>
        </view>
        <view
          v-for="table in availableTables"
          :key="table.table_id"
          class="table-option"
          :class="{
            'is-on': isTableSelected(table),
            'is-disabled': !table.selectable,
          }"
          @click="pickTable(table)"
        >
          <view class="table-option__main">
            <text class="table-option__title">{{ table.table_name || table.table_code }}</text>
            <text class="table-option__meta">
              {{ table.table_code }} · {{ tableStatusLabel(table) }}
              <template v-if="table.capacity"> · {{ table.capacity }}人</template>
            </text>
          </view>
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

.ck-delivery-hint {
  display: block;
  margin: -8rpx 8rpx 8rpx;
  color: $mp-brass;
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

.ck-bar__btn--off {
  background: $mp-stone;
  color: $mp-text-3;
}

.table-list {
  padding: 16rpx 32rpx 48rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.table-hint {
  padding: 8rpx 4rpx 4rpx;
}

.table-option {
  min-height: 96rpx;
  padding: 20rpx 28rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  font-size: 30rpx;
  color: $mp-text;
  box-shadow: inset 0 0 0 1rpx $mp-border;
  background: $mp-cloud;
}

.table-option__main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.table-option__title {
  font-size: 30rpx;
  color: inherit;
}

.table-option__meta {
  font-size: 22rpx;
  color: $mp-text-3;
}

.table-option.is-on {
  color: $mp-paper;
  background: $mp-moss;
  box-shadow: none;
}

.table-option.is-on .table-option__meta {
  color: rgba(247, 244, 238, 0.72);
}

.table-option.is-disabled {
  opacity: 0.45;
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
