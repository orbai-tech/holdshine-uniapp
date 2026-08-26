<script setup lang="ts">
import { computed } from 'vue'
import { storeCanAcceptOrders, storeStatusLabel } from '@/common/apis/storeApi'
import type { StoreRes } from '@/common/types/store'

const props = withDefaults(
  defineProps<{
    info: StoreRes
    distance: string
    selected?: boolean
  }>(),
  { selected: false },
)

const emit = defineEmits<{
  select: []
  detail: []
}>()

const addressLine = computed(() => {
  const parts = [props.info.district, props.info.address].filter(Boolean)
  return parts.join(' ') || '地址待完善'
})

const hours = computed(() => props.info.business_hours || '营业时间待定')

const openLabel = computed(() => storeStatusLabel(props.info))

const openTone = computed(() =>
  storeCanAcceptOrders(props.info) ? 'store-card__status--on' : 'store-card__status--off',
)

/** 是否可下单：休息/暂停接单时 CTA 置灰（卡片仍可点击切换门店） */
const canOrder = computed(() => storeCanAcceptOrders(props.info))
</script>

<template>
  <view class="store-card" :class="{ 'is-selected': selected }" @click="emit('select')">
    <view class="store-card__main">
      <view class="store-card__name-row">
        <text class="store-card__name">{{ info.store_name }}</text>
        <text class="store-card__detail" @click.stop="emit('detail')">详情</text>
      </view>
      <view class="store-card__address">
        <text class="store-card__pin">⌖</text>
        <text class="store-card__address-text">{{ addressLine }}</text>
      </view>
      <view class="store-card__meta">
        <text class="store-card__meta-text">{{ hours }} · </text>
        <text class="store-card__status" :class="openTone">{{ openLabel }}</text>
      </view>
    </view>

    <view class="store-card__side">
      <text class="store-card__cta" :class="{ 'store-card__cta--off': !canOrder }">去点单</text>
      <text class="store-card__distance">距您{{ distance }}</text>
    </view>

    <view v-if="selected" class="store-card__mark" />
  </view>
</template>

<style lang="scss" scoped>
.store-card {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 28rpx 28rpx 32rpx;
  background: $mp-cloud;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 4rpx rgba(20, 17, 15, 0.04);
  overflow: hidden;
}

.store-card.is-selected {
  box-shadow:
    inset 0 0 0 2rpx $mp-moss,
    0 2rpx 4rpx rgba(20, 17, 15, 0.04);
}

.store-card__main {
  flex: 1;
  min-width: 0;
  padding-right: 24rpx;
}

.store-card__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.store-card__name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 500;
  color: $mp-text;
  line-height: 1.35;
}

.store-card__detail {
  flex-shrink: 0;
  font-size: 22rpx;
  letter-spacing: 0.08em;
  color: $mp-brass;
  padding: 4rpx 0;
}

.store-card__address {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 12rpx;
}

.store-card__pin {
  flex-shrink: 0;
  margin-top: 2rpx;
  font-size: 22rpx;
  color: $mp-text-3;
  line-height: 1.4;
}

.store-card__address-text {
  flex: 1;
  font-size: 22rpx;
  color: $mp-text-2;
  line-height: 1.5;
}

.store-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 12rpx;
}

.store-card__meta-text {
  font-size: 22rpx;
  color: $mp-text-3;
}

.store-card__status {
  font-size: 22rpx;
}

.store-card__status--on {
  color: $mp-moss;
}

.store-card__status--off {
  color: $mp-text-3;
}

.store-card__side {
  flex-shrink: 0;
  width: 148rpx;
  padding-left: 24rpx;
  border-left: 1rpx solid $mp-border;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
}

.store-card__cta {
  font-size: 26rpx;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: $mp-moss;
}

.store-card__cta--off {
  color: $mp-text-3;
}

.store-card__distance {
  font-size: 20rpx;
  color: $mp-text-3;
  text-align: center;
}

.store-card__mark {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 36rpx 36rpx;
  border-color: transparent transparent $mp-moss transparent;
}
</style>
