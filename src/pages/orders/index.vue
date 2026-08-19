<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import SoorakSheet from '@/components/soorak-sheet/soorak-sheet.vue'
import { getTakeawayDispatch } from '@/common/apis/deliveryApi'
import { cancelOrder, getOrder, listMyOrders } from '@/common/apis/orderApi'
import type { TakeawayDispatchRes } from '@/common/types/delivery'
import type { OrderItemRes, OrderRes } from '@/common/types/order'
import {
  canCancelOrder,
  ORDER_STATUS,
  orderStatusLabel,
  SERVICE_MODE,
  serviceModeLabel,
} from '@/common/types/orderEnums'
import { useCartStore } from '@/stores/cart'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { formatItemSpec } from '@/utils/orderItemLabel'
import { itemLineAmount, orderAmountRows } from '@/utils/orderAmounts'
import { parseAmount } from '@/utils/money'
import { PayCancelledError } from '@/utils/pay'

const session = useSessionStore()
const cart = useCartStore()
const loading = ref(false)
const errorText = ref('')
const orders = ref<OrderRes[]>([])
const detailOpen = ref(false)
const detailLoading = ref(false)
const detail = ref<OrderRes | null>(null)
const cancelBusy = ref(false)
const payBusy = ref(false)
const dispatch = ref<TakeawayDispatchRes | null>(null)
const dispatchBusy = ref(false)
const dispatchError = ref('')

const hasAny = computed(() => orders.value.length > 0)
const detailCanCancel = computed(() =>
  detail.value ? canCancelOrder(detail.value.order_status) : false,
)
const detailCanPay = computed(() => detailCanCancel.value)
const detailIsDelivery = computed(
  () => detail.value?.service_mode === SERVICE_MODE.DELIVERY,
)
const detailAmountRows = computed(() =>
  detail.value ? orderAmountRows(detail.value) : [],
)
const dispatchTraces = computed(() => (dispatch.value?.traces ?? []).slice(0, 8))

function clearDispatch() {
  dispatch.value = null
  dispatchError.value = ''
}

async function loadDispatch(order: OrderRes) {
  if (order.service_mode === SERVICE_MODE.MEMBER_CARD) {
    clearDispatch()
    return
  }
  if (order.service_mode !== SERVICE_MODE.DELIVERY) {
    clearDispatch()
    return
  }
  if (order.order_status === ORDER_STATUS.UNPAID || order.order_status === ORDER_STATUS.CANCELLED) {
    clearDispatch()
    return
  }
  dispatchBusy.value = true
  dispatchError.value = ''
  try {
    dispatch.value = await getTakeawayDispatch(order.order_id)
  } catch (error) {
    dispatch.value = null
    dispatchError.value = toErrorMessage(error, '配送进度暂不可用').slice(0, 40)
  } finally {
    dispatchBusy.value = false
  }
}


/** 直接从接口字段拼规格文案 */
function itemSpecText(item: OrderItemRes): string {
  let label = formatItemSpec(item)
  if (!label && parseAmount(item.option_amount) > 0) {
    label = `加料 ¥${item.option_amount}`
  }
  return label
}

function patchOrderInList(next: OrderRes) {
  const idx = orders.value.findIndex((row) => row.order_id === next.order_id)
  if (idx >= 0) {
    const copy = orders.value.slice()
    copy[idx] = next
    orders.value = copy
  }
}

async function load() {
  if (!session.loggedIn) {
    orders.value = []
    errorText.value = ''
    loading.value = false
    detailOpen.value = false
    detail.value = null
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const page = await listMyOrders()
    orders.value = page.list ?? []
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      orders.value = []
      errorText.value = ''
      return
    }
    errorText.value = toErrorMessage(error, '加载失败')
  } finally {
    loading.value = false
  }
}

async function onLogin() {
  const ok = await session.requestLogin()
  if (!ok) return
  await load()
}

async function openDetail(order: OrderRes) {
  detail.value = order
  detailOpen.value = true
  detailLoading.value = true
  clearDispatch()
  try {
    const fresh = await getOrder(order.order_id)
    detail.value = fresh
    patchOrderInList(fresh)
    await loadDispatch(fresh)
  } catch (error) {
    const message = toErrorMessage(error, '加载详情失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  clearDispatch()
}

async function refreshDispatch() {
  if (!detail.value || dispatchBusy.value) return
  await loadDispatch(detail.value)
}

async function onCancel(order: OrderRes, fromSheet: boolean) {
  if (!canCancelOrder(order.order_status) || cancelBusy.value) return
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '取消订单',
      content: `确认取消单号 ${order.order_no}？`,
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false),
    })
  })
  if (!confirmed) return

  cancelBusy.value = true
  try {
    const next = await cancelOrder(order.order_id)
    patchOrderInList(next)
    if (fromSheet || (detail.value && detail.value.order_id === next.order_id)) {
      detail.value = next
    }
    uni.showToast({ title: '已取消', icon: 'none' })
  } catch (error) {
    const message = toErrorMessage(error, '取消失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    cancelBusy.value = false
  }
}

async function onPay(order: OrderRes) {
  if (!canCancelOrder(order.order_status) || payBusy.value || cart.writeBusy) return
  payBusy.value = true
  try {
    await cart.payOrder(order.order_id)
    const fresh = await getOrder(order.order_id)
    patchOrderInList(fresh)
    if (detail.value && detail.value.order_id === fresh.order_id) {
      detail.value = fresh
    }
    uni.showToast({ title: '支付成功', icon: 'none' })
  } catch (error) {
    if (error instanceof PayCancelledError || (error instanceof Error && error.message === 'PAY_CANCELLED')) {
      return
    }
    const message = toErrorMessage(error, '支付失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
  } finally {
    payBusy.value = false
  }
}

onShow(() => {
  session.hideNativeTabBar()
  void load()
})
</script>

<template>
  <SoorakChrome title="订单">
    <view v-if="!session.loggedIn" class="mp-empty page-pad">
      <text class="mp-empty__title">登录后查看订单</text>
      <text class="t-caption">购物车与订单需要登录后同步</text>
      <SoorakButton :disabled="session.authBusy" @click="onLogin">
        {{ session.authBusy ? '登录中…' : '微信一键登录' }}
      </SoorakButton>
    </view>
    <view v-else-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="errorText" class="mp-empty page-pad">
      <text class="t-caption">{{ errorText }}</text>
      <SoorakButton @click="load">重试</SoorakButton>
    </view>
    <view v-else-if="!hasAny" class="mp-empty page-pad">
      <text class="mp-empty__title">暂无订单</text>
      <text class="t-caption">下单后可在此查看制作进度</text>
      <SoorakButton @click="session.goMenu()">去点单</SoorakButton>
    </view>
    <view v-else class="page-orders page-pad">
      <view
        v-for="order in orders"
        :key="order.order_id"
        class="order-card"
        @click="openDetail(order)"
      >
        <view class="order-card__top">
          <view>
            <text class="t-label">
              {{ serviceModeLabel(order.service_mode)
              }}{{ order.table_name ? ` · ${order.table_name}` : '' }}
            </text>
            <text class="order-card__id">单号 {{ order.order_no }}</text>
          </view>
          <text class="order-card__status">{{ orderStatusLabel(order.order_status) }}</text>
        </view>
        <view class="order-card__items">
          <view
            v-for="item in order.items || []"
            :key="item.item_id"
            class="order-card__item"
          >
            <text class="order-card__line">
              {{ item.product_name }} ×{{ item.quantity }}
            </text>
            <view v-if="itemSpecText(item)" class="order-card__spec">
              <text>{{ itemSpecText(item) }}</text>
            </view>
          </view>
        </view>
        <view class="order-card__foot">
          <text class="t-caption">{{ order.created_at || '' }}</text>
          <view class="order-card__foot-right">
            <text class="order-card__total">¥{{ order.payable_amount }}</text>
            <view
              v-if="canCancelOrder(order.order_status)"
              class="order-card__pay"
              @click.stop="onPay(order)"
            >
              <text>去支付</text>
            </view>
            <view
              v-if="canCancelOrder(order.order_status)"
              class="order-card__cancel"
              @click.stop="onCancel(order, false)"
            >
              <text>取消</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <SoorakSheet :open="detailOpen" title="订单详情" @close="closeDetail">
      <view v-if="detail" class="order-detail">
        <view class="order-detail__head">
          <text class="order-detail__status">{{ orderStatusLabel(detail.order_status) }}</text>
          <text class="t-caption">
            {{ serviceModeLabel(detail.service_mode)
            }}{{ detail.table_name ? ` · ${detail.table_name}` : '' }}
          </text>
        </view>
        <text class="order-detail__no">单号 {{ detail.order_no }}</text>
        <text v-if="detailLoading" class="t-caption order-detail__hint">刷新中…</text>

        <view class="order-detail__section">
          <view
            v-for="item in detail.items || []"
            :key="item.item_id"
            class="order-detail__item"
          >
            <view class="order-detail__item-row">
              <text class="order-detail__name">{{ item.product_name }} ×{{ item.quantity }}</text>
              <text class="order-detail__line-amt">¥{{ itemLineAmount(item) }}</text>
            </view>
            <text v-if="itemSpecText(item)" class="order-detail__spec">{{ itemSpecText(item) }}</text>
          </view>
        </view>

        <view class="order-detail__amounts">
          <view
            v-for="row in detailAmountRows"
            :key="row.key"
            class="order-detail__amt-row"
            :class="{ 'order-detail__amt-row--total': row.total }"
          >
            <text :class="row.total ? '' : 't-caption'">{{ row.label }}</text>
            <text :class="{ 'order-detail__payable': row.total }">
              {{ row.negative ? '-' : '' }}¥{{ row.amount }}
            </text>
          </view>
        </view>

        <view class="order-detail__meta">
          <text v-if="detail.pickup_code" class="order-detail__meta-line">
            取餐码 {{ detail.pickup_code }}
          </text>
          <text v-if="detail.customer_remark" class="order-detail__meta-line">
            备注 {{ detail.customer_remark }}
          </text>
          <text class="order-detail__meta-line t-caption">{{ detail.created_at || '' }}</text>
        </view>

        <view v-if="detailIsDelivery" class="order-detail__dispatch">
          <view class="order-detail__dispatch-head">
            <text class="order-detail__dispatch-title">配送进度</text>
            <text class="order-detail__dispatch-refresh" @click="refreshDispatch">刷新</text>
          </view>
          <text v-if="dispatchBusy" class="t-caption">加载中…</text>
          <text v-else-if="dispatchError" class="t-caption">{{ dispatchError }}</text>
          <template v-else-if="dispatch">
            <text v-if="dispatch.courier_name" class="order-detail__meta-line">
              骑手 {{ dispatch.courier_name
              }}{{ dispatch.agent_phone ? ` · ${dispatch.agent_phone}` : '' }}
            </text>
            <text v-if="dispatch.remark" class="order-detail__meta-line">{{ dispatch.remark }}</text>
            <view v-for="(trace, idx) in dispatchTraces" :key="`${trace.action_time}-${idx}`" class="order-trace">
              <text class="order-trace__msg">{{ trace.action_msg }}</text>
              <text class="order-trace__time t-caption">{{ trace.action_time }}</text>
            </view>
            <text v-if="!dispatchTraces.length" class="t-caption">暂无轨迹</text>
          </template>
          <text v-else class="t-caption">支付完成后可查看配送进度</text>
        </view>
      </view>
      <template v-if="detailCanPay || detailCanCancel" #footer>
        <view class="order-detail__actions">
          <SoorakButton
            v-if="detailCanCancel"
            variant="secondary"
            :disabled="cancelBusy || payBusy"
            @click="detail && onCancel(detail, true)"
          >
            {{ cancelBusy ? '取消中…' : '取消订单' }}
          </SoorakButton>
          <SoorakButton
            v-if="detailCanPay"
            :disabled="payBusy || cart.writeBusy || cancelBusy"
            @click="detail && onPay(detail)"
          >
            {{ payBusy ? '支付中…' : '去支付' }}
          </SoorakButton>
        </view>
      </template>
    </SoorakSheet>
  </SoorakChrome>
</template>

<style lang="scss" scoped>
.order-card {
  background: $mp-cloud;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 4rpx rgba(20, 17, 15, 0.04);
}

.order-card__top {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  margin-bottom: 20rpx;
}

.order-card__id {
  display: block;
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 500;
}

.order-card__status {
  font-size: 24rpx;
  color: $mp-moss;
  letter-spacing: 0.06em;
}

.order-card__items {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.order-card__item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.order-card__line {
  font-size: 26rpx;
  color: $mp-text-2;
}

.order-card__spec {
  font-size: 22rpx;
  color: $mp-text-2;
  line-height: 1.45;
  letter-spacing: 0.02em;
}

.order-card__foot {
  margin-top: 24rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $mp-border;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-card__foot-right {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.order-card__total {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 500;
}

.order-card__cancel {
  padding: 8rpx 20rpx;
  border: 1rpx solid $mp-border;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: $mp-text-2;
}

.order-card__pay {
  padding: 8rpx 20rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: $mp-paper;
  background: $mp-moss;
}

.order-detail__actions {
  display: flex;
  gap: 16rpx;
  width: 100%;
}

.order-detail__actions :deep(.mp-btn) {
  flex: 1;
}

.order-detail {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding-bottom: 24rpx;
}

.order-detail__head {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.order-detail__status {
  font-size: 32rpx;
  font-weight: 500;
  color: $mp-moss;
}

.order-detail__no {
  font-size: 28rpx;
  font-weight: 500;
}

.order-detail__hint {
  opacity: 0.7;
}

.order-detail__section {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 8rpx 0 16rpx;
  border-top: 1rpx solid $mp-border;
  border-bottom: 1rpx solid $mp-border;
}

.order-detail__item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.order-detail__item-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.order-detail__name {
  font-size: 26rpx;
  color: $mp-text-2;
}

.order-detail__line-amt {
  font-size: 26rpx;
}

.order-detail__spec {
  font-size: 22rpx;
  color: $mp-text-2;
}

.order-detail__amounts {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.order-detail__amt-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
}

.order-detail__amt-row--total {
  margin-top: 8rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid $mp-border;
  font-weight: 500;
}

.order-detail__payable {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
}

.order-detail__meta {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.order-detail__meta-line {
  font-size: 24rpx;
  color: $mp-text-2;
}

.order-detail__dispatch {
  margin-top: 8rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $mp-border;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.order-detail__dispatch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.order-detail__dispatch-title {
  font-size: 28rpx;
  font-weight: 500;
}

.order-detail__dispatch-refresh {
  font-size: 24rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
}

.order-trace {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 8rpx 0;
}

.order-trace__msg {
  font-size: 26rpx;
}

.order-trace__time {
  font-size: 22rpx;
}
</style>
