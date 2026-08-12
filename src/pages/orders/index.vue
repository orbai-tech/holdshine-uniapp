<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import SoorakChrome from '@/components/soorak-chrome/soorak-chrome.vue'
import SoorakButton from '@/components/soorak-button/soorak-button.vue'
import { listMyOrders } from '@/common/apis/orderApi'
import type { OrderRes } from '@/common/types/order'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const loading = ref(false)
const errorText = ref('')
const orders = ref<OrderRes[]>([])

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const page = await listMyOrders()
    orders.value = page.list ?? []
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onShow(() => {
  void load()
})
</script>

<template>
  <SoorakChrome title="订单">
    <view v-if="loading" class="mp-empty">
      <text class="t-caption">加载中</text>
    </view>
    <view v-else-if="errorText" class="mp-empty page-pad">
      <text class="t-caption">{{ errorText }}</text>
      <SoorakButton @click="load">重试</SoorakButton>
    </view>
    <view v-else-if="!orders.length" class="mp-empty page-pad">
      <text class="mp-empty__title">暂无订单</text>
      <text class="t-caption">下单后可在此查看制作进度</text>
      <SoorakButton @click="session.goTab('/pages/menu/index')">去点单</SoorakButton>
    </view>
    <view v-else class="page-orders page-pad">
      <view v-for="order in orders" :key="order.order_id" class="order-card">
        <view class="order-card__top">
          <view>
            <text class="t-label">—</text>
            <text class="order-card__id">单号 {{ order.order_no }}</text>
          </view>
          <text class="order-card__status">—</text>
        </view>
        <view class="order-card__items">
          <text v-for="item in order.items ?? []" :key="item.item_id" class="order-card__line">
            {{ item.product_name }} ×{{ item.quantity }}
          </text>
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
  gap: 8rpx;
}

.order-card__line {
  font-size: 26rpx;
  color: $mp-text-2;
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
