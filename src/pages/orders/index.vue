<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { listMyOrders } from '@/common/apis/orderApi'
import type { OrderItemRes, OrderRes } from '@/common/types/order'
import { orderStatusLabel, serviceModeLabel } from '@/common/types/orderEnums'
import { useSessionStore } from '@/stores/session'
import { toErrorMessage } from '@/utils/errorMessage'
import { formatItemSpec } from '@/utils/orderItemLabel'
import { parseAmount } from '@/utils/money'

const session = useSessionStore()
const loading = ref(false)
const errorText = ref('')
const orders = ref<OrderRes[]>([])

const hasAny = computed(() => orders.value.length > 0)

/** 直接从接口字段拼规格文案 */
function itemSpecText(item: OrderItemRes): string {
  let label = formatItemSpec(item)
  if (!label && parseAmount(item.option_amount) > 0) {
    label = `加料 ¥${item.option_amount}`
  }
  return label
}

async function load() {
  if (!session.loggedIn) {
    orders.value = []
    errorText.value = ''
    loading.value = false
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
  try {
    await session.login()
    uni.showToast({ title: '登录成功', icon: 'none' })
    await load()
  } catch (error) {
    const message = toErrorMessage(error, '登录失败')
    if (message !== 'UNAUTHORIZED') {
      uni.showToast({ title: message.slice(0, 40), icon: 'none' })
    }
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
      <SoorakButton @click="session.goTab('/pages/menu/index')">去点单</SoorakButton>
    </view>
    <view v-else class="page-orders page-pad">
      <view v-for="order in orders" :key="order.order_id" class="order-card">
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
          <text class="order-card__total">¥{{ order.payable_amount }}</text>
        </view>
      </view>
    </view>
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
  align-items: baseline;
}

.order-card__total {
  font-family: "Songti SC", "Noto Serif SC", serif;
  font-size: 36rpx;
  font-weight: 500;
}
</style>
